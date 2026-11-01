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
 * @file gmailService.test.ts
 * @description Gmail 新邮件轮询服务测试：基线、新邮件提醒、错误分类、停止与并发（gws 调用全部使用注入的假实现，计时器使用假时钟）
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { GwsError } from '../gwsRunner';
import type { GmailNewMailPayload, GmailReminderStatus } from '../../../shared/gmailReminderTypes';
import { GMAIL_POLL_INTERVAL_MS, createGmailReminderService, parseSenderName } from '../gmailService';

const LIST_ARGS_PREFIX = ['gmail', 'users', 'messages', 'list'];
const GET_ARGS_PREFIX = ['gmail', 'users', 'messages', 'get'];

/** 构造 messages.list 响应。 */
function listOf(...ids: string[]): unknown {
  return { messages: ids.map((id) => ({ id, threadId: `thread-${id}` })), resultSizeEstimate: ids.length };
}

/** 构造 messages.get（metadata）响应。 */
function metadata(from: string, subject: string): unknown {
  return { payload: { headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }] } };
}

let run: ReturnType<typeof vi.fn<(args: string[]) => Promise<unknown>>>;
let sendNewMail: Mock<(payload: GmailNewMailPayload) => void>;
let broadcastStatus: Mock<(status: GmailReminderStatus) => void>;

beforeEach(() => {
  vi.useFakeTimers();
  run = vi.fn<(args: string[]) => Promise<unknown>>();
  sendNewMail = vi.fn();
  broadcastStatus = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 为测试创建服务实例，并注入固定时钟。 */
function createService() {
  return createGmailReminderService({ run, sendNewMail, broadcastStatus, now: () => 1_700_000_000_000 });
}

/** 让所有待处理的 Promise 回调执行完毕。 */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('createGmailReminderService polling', () => {
  it('records the existing unread mail on the first poll without notifying', async () => {
    run.mockResolvedValueOnce(listOf('a', 'b'));
    const service = createService();
    service.start();
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].slice(0, 4)).toEqual(LIST_ARGS_PREFIX);
    expect(sendNewMail).not.toHaveBeenCalled();
    expect(service.getStatus()).toEqual({ kind: 'ok', checkedAt: 1_700_000_000_000 });
  });

  it('sends one reminder for the newest unseen message with sender, subject and inbox link', async () => {
    run
      .mockResolvedValueOnce(listOf('a'))
      .mockResolvedValueOnce(listOf('b', 'a'))
      .mockResolvedValueOnce(metadata('Ada Lovelace <ada@example.com>', 'Engine notes'));
    const service = createService();
    service.start();
    await flush();
    vi.advanceTimersByTime(GMAIL_POLL_INTERVAL_MS);
    await flush();
    expect(run.mock.calls[2][0].slice(0, 4)).toEqual(GET_ARGS_PREFIX);
    expect(JSON.parse(run.mock.calls[2][0][5])).toMatchObject({ id: 'b', format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
    expect(sendNewMail).toHaveBeenCalledOnce();
    expect(sendNewMail).toHaveBeenCalledWith({
      sender: 'Ada Lovelace',
      subject: 'Engine notes',
      url: 'https://mail.google.com/mail/u/0/#inbox/thread-b',
      count: 1,
    });
  });

  it('reports how many messages were new in this poll', async () => {
    run
      .mockResolvedValueOnce(listOf())
      .mockResolvedValueOnce(listOf('c', 'd', 'e'))
      .mockResolvedValueOnce(metadata('Bob <bob@example.com>', 'Lunch'));
    const service = createService();
    service.start();
    await flush();
    vi.advanceTimersByTime(GMAIL_POLL_INTERVAL_MS);
    await flush();
    expect(sendNewMail).toHaveBeenCalledWith(expect.objectContaining({ count: 3, sender: 'Bob' }));
  });

  it('still reminds about new mail with generic text when the detail read fails', async () => {
    run
      .mockResolvedValueOnce(listOf())
      .mockResolvedValueOnce(listOf('x'))
      .mockRejectedValueOnce(new GwsError('error', 'boom'));
    const service = createService();
    service.start();
    await flush();
    vi.advanceTimersByTime(GMAIL_POLL_INTERVAL_MS);
    await flush();
    expect(sendNewMail).toHaveBeenCalledWith(expect.objectContaining({ sender: '', subject: '', count: 1 }));
  });

  it('polls again every two minutes while running', async () => {
    run.mockResolvedValue(listOf());
    const service = createService();
    service.start();
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(GMAIL_POLL_INTERVAL_MS - 1);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    await flush();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not poll after stop and reports disabled', async () => {
    run.mockResolvedValue(listOf());
    const service = createService();
    service.start();
    await flush();
    service.stop();
    vi.advanceTimersByTime(GMAIL_POLL_INTERVAL_MS * 3);
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toEqual({ kind: 'disabled', checkedAt: null });
    expect(broadcastStatus).toHaveBeenLastCalledWith({ kind: 'disabled', checkedAt: null });
  });

  it('starts a fresh baseline after restart so old unread mail does not flood', async () => {
    run.mockResolvedValue(listOf('old'));
    const service = createService();
    service.start();
    await flush();
    service.stop();
    service.start();
    await flush();
    expect(sendNewMail).not.toHaveBeenCalled();
  });

  it('does not notify when checked manually while stopped', async () => {
    run
      .mockResolvedValueOnce(listOf())
      .mockResolvedValueOnce(listOf('n'));
    const service = createService();
    await service.checkNow();
    await service.checkNow();
    expect(sendNewMail).not.toHaveBeenCalled();
  });

  it('shares one in-flight request between overlapping checks', async () => {
    let resolveList: (value: unknown) => void = () => {};
    run.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve; }));
    const service = createService();
    const first = service.checkNow();
    const second = service.checkNow();
    expect(run).toHaveBeenCalledTimes(1);
    resolveList(listOf());
    await expect(Promise.all([first, second])).resolves.toEqual([
      { kind: 'ok', checkedAt: 1_700_000_000_000 },
      { kind: 'ok', checkedAt: 1_700_000_000_000 },
    ]);
  });

  it('discards a poll result that finishes after stop', async () => {
    let resolveList: (value: unknown) => void = () => {};
    run.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve; }));
    const service = createService();
    service.start();
    service.stop();
    resolveList(listOf('late'));
    await flush();
    expect(service.getStatus()).toEqual({ kind: 'disabled', checkedAt: null });
    expect(sendNewMail).not.toHaveBeenCalled();
  });
});

describe('createGmailReminderService status kinds', () => {
  it.each([
    [new GwsError('missing', 'gws executable not found'), 'missing'],
    [new GwsError('not-logged-in', 'gws exited with code 1'), 'not-logged-in'],
    [new GwsError('network', 'gws timed out'), 'network'],
    [new GwsError('error', 'gws output contains no JSON'), 'error'],
    [new Error('unexpected'), 'error'],
  ])('maps %s to status %s and broadcasts it', async (error, kind) => {
    run.mockRejectedValueOnce(error);
    const service = createService();
    const status = await service.checkNow();
    expect(status).toEqual({ kind, checkedAt: 1_700_000_000_000 });
    expect(broadcastStatus).toHaveBeenCalledWith(status);
  });

  it('recovers to ok after an error once a later check succeeds', async () => {
    run
      .mockRejectedValueOnce(new GwsError('network', 'gws timed out'))
      .mockResolvedValueOnce(listOf());
    const service = createService();
    await service.checkNow();
    expect((await service.checkNow()).kind).toBe('ok');
  });
});

describe('parseSenderName', () => {
  it.each([
    ['Ada Lovelace <ada@example.com>', 'Ada Lovelace'],
    ['"Lovelace, Ada" <ada@example.com>', 'Lovelace, Ada'],
    ['<ada@example.com>', 'ada'],
    ['ada@example.com', 'ada'],
    ['   ', ''],
  ])('extracts the display name from %j', (from, expected) => {
    expect(parseSenderName(from)).toBe(expected);
  });
});
