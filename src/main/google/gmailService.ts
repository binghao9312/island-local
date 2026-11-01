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
 * @file gmailService.ts
 * @description Gmail 新邮件提醒轮询服务。只读查询未读收件箱，发现新邮件时通过回调推送给灵动岛。
 * @author 鸡哥
 */

import { GwsError, runGws } from './gwsRunner';
import type { GmailNewMailPayload, GmailReminderStatus, GmailReminderStatusKind } from '../../shared/gmailReminderTypes';

/** 轮询间隔（毫秒） */
export const GMAIL_POLL_INTERVAL_MS = 2 * 60 * 1000;

/** 未读收件箱查询条件 */
const LIST_QUERY = 'is:unread in:inbox';
const LIST_MAX_RESULTS = 10;
const GMAIL_INBOX_URL = 'https://mail.google.com/mail/u/0/#inbox/';

/** Gmail 提醒服务依赖，便于测试时替换 gws 调用与推送 */
export interface GmailReminderServiceOptions {
  /** 执行 gws 命令，默认使用 runGws */
  run?: (args: string[]) => Promise<unknown>;
  /** 推送新邮件提醒到灵动岛窗口 */
  sendNewMail: (payload: GmailNewMailPayload) => void;
  /** 状态变化时广播给所有窗口，供设置页更新状态行 */
  broadcastStatus: (status: GmailReminderStatus) => void;
  /** 当前时间戳（毫秒），默认 Date.now */
  now?: () => number;
}

/** Gmail 新邮件提醒服务实例 */
export interface GmailReminderService {
  /** 开始轮询；首次轮询只记录现有未读邮件，不产生提醒 */
  start: () => void;
  /** 停止轮询并清空已见邮件记录 */
  stop: () => void;
  /** 立即执行一次检查并返回最新状态；关闭状态下不产生提醒 */
  checkNow: () => Promise<GmailReminderStatus>;
  /** 返回最近一次的状态 */
  getStatus: () => GmailReminderStatus;
}

/**
 * 将 gws 错误映射为设置页状态种类。
 * @param error - 捕获到的错误
 * @returns 状态种类，非 GwsError 统一为 error
 */
function statusKindOf(error: unknown): GmailReminderStatusKind {
  return error instanceof GwsError ? error.kind : 'error';
}

/**
 * 从 messages.list 的响应中提取消息引用。
 * @param value - gws 返回的 JSON
 * @returns 消息 ID 与会话 ID 列表（Gmail 按时间倒序返回）
 */
function parseMessageRefs(value: unknown): Array<{ id: string; threadId: string }> {
  const messages = (value as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message: unknown) => {
    const ref = message as { id?: unknown; threadId?: unknown } | null;
    return typeof ref?.id === 'string' && typeof ref.threadId === 'string' ? [{ id: ref.id, threadId: ref.threadId }] : [];
  });
}

/**
 * 从 messages.get（metadata 格式）的响应中读取 From 与 Subject 头。
 * @param value - gws 返回的 JSON
 * @returns 头字段值，缺失时为空字符串
 */
function parseHeaders(value: unknown): { from: string; subject: string } {
  const headers = (value as { payload?: { headers?: unknown } } | null)?.payload?.headers;
  const result = { from: '', subject: '' };
  if (!Array.isArray(headers)) return result;
  for (const header of headers as Array<{ name?: unknown; value?: unknown }>) {
    if (typeof header?.name !== 'string' || typeof header.value !== 'string') continue;
    const name = header.name.toLowerCase();
    if (name === 'from') result.from = header.value;
    if (name === 'subject') result.subject = header.value;
  }
  return result;
}

/**
 * 从 From 头中取发件人显示名；没有显示名时退回邮箱地址的本地部分。
 * @param from - 原始 From 头，例如 "Name <name@example.com>"
 * @returns 发件人显示名，无法识别时为空字符串
 */
export function parseSenderName(from: string): string {
  const trimmed = from.trim();
  const named = trimmed.match(/^"?([^"<]*?)"?\s*<[^>]*>$/);
  if (named && named[1].trim()) return named[1].trim();
  const address = trimmed.replace(/[<>]/g, '');
  return address.split('@')[0] ?? '';
}

/**
 * 创建 Gmail 新邮件提醒服务。
 * @param options - 服务依赖（gws 调用、推送与状态广播）
 * @returns 服务实例
 */
export function createGmailReminderService(options: GmailReminderServiceOptions): GmailReminderService {
  const run = options.run ?? runGws;
  const now = options.now ?? Date.now;
  let status: GmailReminderStatus = { kind: 'disabled', checkedAt: null };
  let running = false;
  /** 每次启动或停止递增，用于丢弃停止前发出的请求结果 */
  let generation = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  /** null 表示尚未建立基线，首次轮询只记录 */
  let seenIds: Set<string> | null = null;
  let inFlight: Promise<GmailReminderStatus> | null = null;

  const setStatus = (next: GmailReminderStatus): GmailReminderStatus => {
    status = next;
    options.broadcastStatus(next);
    return next;
  };

  /**
   * 发现新邮件时读取最新一封的发件人与主题，并推送一条提醒。读取失败时使用通用文案。
   * @param fresh - 本次新出现的邮件引用，最新的在前
   */
  const notifyNewest = async (fresh: Array<{ id: string; threadId: string }>): Promise<void> => {
    const newest = fresh[0];
    let headers = { from: '', subject: '' };
    try {
      headers = parseHeaders(await run(['gmail', 'users', 'messages', 'get', '--params', JSON.stringify({
        userId: 'me',
        id: newest.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })]));
    } catch {
      // 详情读取失败时仍提醒有新邮件，只是缺少发件人与主题。
    }
    if (!running) return;
    options.sendNewMail({
      sender: parseSenderName(headers.from),
      subject: headers.subject,
      url: `${GMAIL_INBOX_URL}${newest.threadId}`,
      count: fresh.length,
    });
  };

  /**
   * 执行一次列表查询并更新基线；发现新邮件时推送提醒。
   * @param startedAt - 发起轮询时的 generation，期间被启动或停止则丢弃结果
   * @returns 轮询完成后的状态
   */
  const runPoll = async (startedAt: number): Promise<GmailReminderStatus> => {
    try {
      const refs = parseMessageRefs(await run(['gmail', 'users', 'messages', 'list', '--params', JSON.stringify({
        userId: 'me',
        q: LIST_QUERY,
        maxResults: LIST_MAX_RESULTS,
      })]));
      if (startedAt !== generation) return status;
      const previous = seenIds;
      seenIds = new Set(refs.map((ref) => ref.id));
      const fresh = previous ? refs.filter((ref) => !previous.has(ref.id)) : [];
      if (running && fresh.length > 0) await notifyNewest(fresh);
      return startedAt === generation ? setStatus({ kind: 'ok', checkedAt: now() }) : status;
    } catch (error) {
      if (startedAt !== generation) return status;
      return setStatus({ kind: statusKindOf(error), checkedAt: now() });
    }
  };

  /**
   * 执行一次轮询；同一时间只保留一个进行中的请求，重复调用共享其结果。
   * @returns 轮询完成后的状态
   */
  const poll = (): Promise<GmailReminderStatus> => {
    if (!inFlight) {
      inFlight = runPoll(generation).finally(() => { inFlight = null; });
    }
    return inFlight;
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      generation += 1;
      seenIds = null;
      void poll();
      timer = setInterval(() => { void poll(); }, GMAIL_POLL_INTERVAL_MS);
    },
    stop: () => {
      running = false;
      generation += 1;
      seenIds = null;
      if (timer) clearInterval(timer);
      timer = null;
      setStatus({ kind: 'disabled', checkedAt: null });
    },
    checkNow: () => poll(),
    getStatus: () => status,
  };
}
