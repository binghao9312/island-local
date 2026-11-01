/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file claudeUsageLimitService.ts
 * @description 通过 Claude Code 自身使用的 OAuth 用量接口获取 5 小时与每周额度，结果缓存 5 分钟
 * @description 访问令牌只在主进程读取并用于请求头，不写日志、不返回渲染进程；错误信息只携带状态码
 * @author 鸡哥
 */

import { readFile } from 'fs/promises';
import type { AgentQuotaStatus, AgentUsageRateLimits, AgentUsageRateLimitWindow } from '../../preload/types/agentUsage';

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const USAGE_BETA_HEADER = 'oauth-2025-04-20';
/** 与 Claude Code 自身的刷新节奏保持克制，避免触发接口限流。 */
const CACHE_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const FIVE_HOUR_WINDOW_MINUTES = 300;
const WEEKLY_WINDOW_MINUTES = 10080;

/** Claude 额度获取结果 */
export interface ClaudeQuotaResult {
  status: AgentQuotaStatus;
  rateLimits: AgentUsageRateLimits | null;
}

/** Claude 额度服务 */
export interface ClaudeUsageLimitService {
  getQuota: () => Promise<ClaudeQuotaResult>;
}

interface CreateClaudeUsageLimitServiceOptions {
  /** Claude Code 凭据文件路径，通常为 ~/.claude/.credentials.json */
  credentialsPath: string;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

interface ClaudeCredentials {
  accessToken: string;
  /** 毫秒时间戳；缺失时不做过期预判，由接口的 401 决定 */
  expiresAt: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/**
 * 读取 Claude Code 凭据中的访问令牌。
 * @description 文件缺失或格式不符时返回 null；异常被吞掉，避免解析错误把文件内容带入日志。
 * @param path - 凭据文件路径
 * @returns 凭据，未登录时为 null
 */
async function readCredentials(path: string): Promise<ClaudeCredentials | null> {
  try {
    const oauth = asRecord(asRecord(JSON.parse(await readFile(path, 'utf8')))?.claudeAiOauth);
    if (typeof oauth?.accessToken !== 'string' || oauth.accessToken === '') return null;
    return {
      accessToken: oauth.accessToken,
      expiresAt: typeof oauth.expiresAt === 'number' ? oauth.expiresAt : null,
    };
  } catch {
    return null;
  }
}

/**
 * 将接口返回的单个窗口转换为额度窗口。
 * @param value - 接口原始窗口对象，如 five_hour / seven_day
 * @param windowMinutes - 该窗口对应的分钟数
 * @returns 额度窗口，接口未返回该窗口时为 null
 */
function claudeWindow(value: unknown, windowMinutes: number): AgentUsageRateLimitWindow | null {
  const window = asRecord(value);
  if (!window || typeof window.utilization !== 'number' || !Number.isFinite(window.utilization)) return null;
  const resetsAt = typeof window.resets_at === 'string' ? Date.parse(window.resets_at) : Number.NaN;
  return {
    usedPercent: Math.max(0, Math.min(100, window.utilization)),
    windowMinutes,
    resetsAt: Number.isFinite(resetsAt) ? resetsAt : null,
  };
}

/**
 * 解析用量接口响应。
 * @description 5 小时与每周窗口分别按固定时长映射；套餐未提供的窗口（接口返回 null）保持为空，由界面提示。
 * @param body - 接口返回的 JSON
 * @param timestamp - 取得额度的时间戳（毫秒）
 * @returns 额度快照，两个窗口都缺失时返回 null
 */
export function parseClaudeRateLimits(body: unknown, timestamp: number): AgentUsageRateLimits | null {
  const root = asRecord(body);
  const fiveHour = claudeWindow(root?.five_hour, FIVE_HOUR_WINDOW_MINUTES);
  const weekly = claudeWindow(root?.seven_day, WEEKLY_WINDOW_MINUTES);
  if (!fiveHour && !weekly) return null;
  return { primary: fiveHour, secondary: weekly, planType: null, updatedAt: timestamp };
}

/**
 * 创建 Claude 额度服务。
 * @description 5 分钟内重复调用直接返回缓存，并发调用共享同一次请求；任何失败都转为状态码而不抛出。
 * @param options - 凭据路径及可注入的时钟与 fetch
 * @returns 额度服务实例
 */
export function createClaudeUsageLimitService(options: CreateClaudeUsageLimitServiceOptions): ClaudeUsageLimitService {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  let cached: { at: number; result: ClaudeQuotaResult } | null = null;
  let inFlight: Promise<ClaudeQuotaResult> | null = null;

  const requestQuota = async (): Promise<ClaudeQuotaResult> => {
    const credentials = await readCredentials(options.credentialsPath);
    if (!credentials) return { status: 'notLoggedIn', rateLimits: null };
    if (credentials.expiresAt !== null && credentials.expiresAt <= now()) return { status: 'loginExpired', rateLimits: null };
    try {
      const response = await fetchImpl(USAGE_URL, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'anthropic-beta': USAGE_BETA_HEADER,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 401 || response.status === 403) return { status: 'loginExpired', rateLimits: null };
      if (!response.ok) return { status: 'error', rateLimits: null };
      const rateLimits = parseClaudeRateLimits(await response.json(), now());
      return rateLimits ? { status: 'ok', rateLimits } : { status: 'noData', rateLimits: null };
    } catch {
      return { status: 'error', rateLimits: null };
    }
  };

  return {
    getQuota: () => {
      if (cached && now() - cached.at < CACHE_MS) return Promise.resolve(cached.result);
      inFlight ??= (async () => {
        try {
          const result = await requestQuota();
          cached = { at: now(), result };
          return result;
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
  };
}
