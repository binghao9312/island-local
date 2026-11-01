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
 * @file claudeUsageLimitService.test.ts
 * @description Claude 额度服务的响应解析、凭据缺失与过期、接口失败状态及 5 分钟缓存测试（fetch 全部为模拟）。
 * @author 鸡哥
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClaudeUsageLimitService, parseClaudeRateLimits } from '../claudeUsageLimitService';

const NOW = Date.UTC(2026, 10, 1, 0, 0, 0);
const RESET_AT = '2026-11-01T05:00:00.000+00:00';
const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';

let dir = '';
let credentialsPath = '';

function writeCredentials(oauth: Record<string, unknown>): void {
  writeFileSync(credentialsPath, JSON.stringify({ claudeAiOauth: oauth, mcpOAuth: {} }));
}

function usageBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { five_hour: { utilization: 19, resets_at: RESET_AT }, seven_day: null, ...overrides };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockFetch(impl: () => Promise<Response>) {
  return vi.fn(impl) as unknown as ReturnType<typeof vi.fn> & typeof fetch;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eisland-claude-quota-'));
  credentialsPath = join(dir, '.credentials.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('parseClaudeRateLimits', () => {
  it('5 小时窗口映射为 300 分钟并解析重置时间，未返回的周窗口不出现在结果中', () => {
    expect(parseClaudeRateLimits(usageBody(), NOW)).toEqual({
      windows: [{ usedPercent: 19, windowMinutes: 300, resetsAt: Date.parse(RESET_AT) }],
      planType: null,
      updatedAt: NOW,
    });
  });

  it('利用率钳制到 0~100，非法重置时间记为 null，周窗口映射为 10080 分钟', () => {
    expect(parseClaudeRateLimits({
      five_hour: { utilization: 130, resets_at: null },
      seven_day: { utilization: -2, resets_at: 'not-a-date' },
    }, NOW)?.windows).toEqual([
      { usedPercent: 100, windowMinutes: 300, resetsAt: null },
      { usedPercent: 0, windowMinutes: 10080, resetsAt: null },
    ]);
  });

  it('真实单窗口套餐：five_hour 与 limits 中的 session 项只保留一个 5 小时窗口', () => {
    const body = {
      five_hour: { utilization: 42, resets_at: RESET_AT },
      seven_day: null,
      limits: [{ kind: 'session', group: 'session', percent: 42, resets_at: RESET_AT, is_active: true }],
    };
    expect(parseClaudeRateLimits(body, NOW)?.windows).toEqual([
      { usedPercent: 42, windowMinutes: 300, resetsAt: Date.parse(RESET_AT) },
    ]);
  });

  it('five_hour 为空时 limits 中的 session 项作为 5 小时窗口展示', () => {
    expect(parseClaudeRateLimits({
      five_hour: null,
      seven_day: null,
      limits: [{ kind: 'session', percent: 7, resets_at: RESET_AT }],
    }, NOW)?.windows).toEqual([
      { usedPercent: 7, windowMinutes: 300, resetsAt: Date.parse(RESET_AT) },
    ]);
  });

  it('limits 中未知类型的窗口时长为 null，并与同样数值的窗口去重', () => {
    expect(parseClaudeRateLimits({
      five_hour: null,
      seven_day: { utilization: 60, resets_at: RESET_AT },
      limits: [
        { kind: 'opus', percent: 15, resets_at: null },
        { kind: 'opus', percent: 15, resets_at: null },
        { kind: 'session', percent: 'n/a' },
      ],
    }, NOW)?.windows).toEqual([
      { usedPercent: 60, windowMinutes: 10080, resetsAt: Date.parse(RESET_AT) },
      { usedPercent: 15, windowMinutes: null, resetsAt: null },
    ]);
  });

  it('两个窗口都缺失、limits 无有效项或响应不是对象时返回 null', () => {
    expect(parseClaudeRateLimits({ five_hour: null, seven_day: null }, NOW)).toBeNull();
    expect(parseClaudeRateLimits({ five_hour: null, seven_day: null, limits: [{ kind: 'session' }] }, NOW)).toBeNull();
    expect(parseClaudeRateLimits('not an object', NOW)).toBeNull();
  });
});

describe('createClaudeUsageLimitService', () => {
  it('携带 Bearer 与 beta 请求头请求用量接口，5 分钟内复用缓存，超时后重新请求', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW + 3_600_000 });
    let current = NOW;
    const fetchImpl = mockFetch(async () => jsonResponse(usageBody()));
    const service = createClaudeUsageLimitService({ credentialsPath, now: () => current, fetchImpl });

    await expect(service.getQuota()).resolves.toMatchObject({ status: 'ok', rateLimits: { windows: [{ usedPercent: 19 }] } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(USAGE_URL);
    expect(init.headers).toEqual({ Authorization: 'Bearer test-access-token', 'anthropic-beta': 'oauth-2025-04-20' });

    current = NOW + 4 * 60_000;
    await service.getQuota();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    current = NOW + 5 * 60_000;
    await service.getQuota();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('并发调用共享同一次请求', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW + 3_600_000 });
    const fetchImpl = mockFetch(async () => jsonResponse(usageBody()));
    const service = createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl });
    await Promise.all([service.getQuota(), service.getQuota()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('未找到凭据或凭据文件损坏时返回未登录，且不发起请求', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(usageBody()));
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl }).getQuota())
      .resolves.toEqual({ status: 'notLoggedIn', rateLimits: null });

    writeFileSync(credentialsPath, '{ broken');
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl }).getQuota())
      .resolves.toEqual({ status: 'notLoggedIn', rateLimits: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('令牌已过期时提示重新登录，且不发起请求', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW - 1 });
    const fetchImpl = mockFetch(async () => jsonResponse(usageBody()));
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl }).getQuota())
      .resolves.toEqual({ status: 'loginExpired', rateLimits: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('接口返回 401 或 403 时提示重新登录', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW + 3_600_000 });
    for (const status of [401, 403]) {
      const fetchImpl = mockFetch(async () => new Response('{}', { status }));
      await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl }).getQuota())
        .resolves.toEqual({ status: 'loginExpired', rateLimits: null });
    }
  });

  it('网络失败或其他错误状态码返回 error，不抛出异常', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW + 3_600_000 });
    const rejected = mockFetch(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl: rejected }).getQuota())
      .resolves.toEqual({ status: 'error', rateLimits: null });
    const serverError = mockFetch(async () => new Response('{}', { status: 500 }));
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl: serverError }).getQuota())
      .resolves.toEqual({ status: 'error', rateLimits: null });
  });

  it('接口未返回任何额度窗口时返回 noData', async () => {
    writeCredentials({ accessToken: 'test-access-token', expiresAt: NOW + 3_600_000 });
    const fetchImpl = mockFetch(async () => jsonResponse({ five_hour: null, seven_day: null }));
    await expect(createClaudeUsageLimitService({ credentialsPath, now: () => NOW, fetchImpl }).getQuota())
      .resolves.toEqual({ status: 'noData', rateLimits: null });
  });
});
