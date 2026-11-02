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
 * @file googleCalendarService.test.ts
 * @description Google 日历服务单元测试：gws 子进程全部被 mock，不会触发真实的日历读写
 * @author 鸡哥
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildEventBody,
  createGoogleCalendarEvent,
  getGoogleCalendarStatus,
  GoogleCalendarError,
  listGoogleCalendarEvents,
  normalizeEventInput,
  removeGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '../googleCalendarService';

vi.mock('child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs', () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock('os', () => ({ homedir: vi.fn(() => 'C:\\Users\\tester') }));

const GWS_PATH = 'C:\\Users\\tester\\npm\\gws.exe';

interface FakeChildOptions {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: NodeJS.Signals | null;
  error?: NodeJS.ErrnoException;
}

/**
 * 构造模拟的 gws 子进程，异步发出输出与退出事件
 * @param options - 模拟的输出、退出码或启动错误
 * @returns 带 stdout/stderr 的 EventEmitter
 */
function fakeChild(options: FakeChildOptions) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });
  setImmediate(() => {
    if (options.error) {
      child.emit('error', options.error);
      return;
    }
    if (options.stdout) child.stdout.emit('data', Buffer.from(options.stdout));
    if (options.stderr) child.stderr.emit('data', Buffer.from(options.stderr));
    child.emit('close', options.code ?? 0, options.signal ?? null);
  });
  return child;
}

/**
 * 让下一次 spawn 返回指定的模拟子进程
 * @param options - 模拟的输出与退出状态
 */
function nextSpawn(options: FakeChildOptions): void {
  vi.mocked(spawn).mockReturnValueOnce(fakeChild(options) as never);
}

/**
 * 读取最近一次 spawn 的 gws 参数
 * @returns gws 子命令与参数数组
 */
function lastGwsArgs(): string[] {
  const calls = vi.mocked(spawn).mock.calls;
  return calls[calls.length - 1][1] as string[];
}

/**
 * 读取参数数组中某个标志后的 JSON 值
 * @param args - gws 参数数组
 * @param flag - 标志名，如 --params 或 --json
 * @returns 解析后的对象
 */
function jsonArg(args: string[], flag: string): Record<string, unknown> {
  return JSON.parse(args[args.indexOf(flag) + 1]) as Record<string, unknown>;
}

/**
 * 构造 calendarList 响应
 * @param items - 日历条目，缺省为 owner 角色与固定颜色
 * @returns gws 的 JSON 输出
 */
function calendarListOutput(items: Array<Record<string, unknown>>): string {
  return JSON.stringify({ items: items.map((item) => ({ accessRole: 'owner', backgroundColor: '#112233', ...item })) });
}

const RANGE = { timeMin: '2026-10-31T00:00:00.000Z', timeMax: '2026-11-30T00:00:00.000Z' };

describe('googleCalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
      mcpServers: { 'google-workspace': { env: { GWS_BIN: GWS_PATH } } },
    }));
  });

  it('reports available and logged in when gws auth status has a valid token', async () => {
    nextSpawn({ stdout: 'Using keyring backend: keyring\n{"token_valid": true, "scope_count": 8}' });

    await expect(getGoogleCalendarStatus()).resolves.toEqual({ available: true, loggedIn: true });
    expect(lastGwsArgs()).toEqual(['auth', 'status']);
    expect(vi.mocked(spawn).mock.calls[0][2]).toMatchObject({ windowsHide: true, shell: false });
  });

  it('reports unavailable without spawning when gws cannot be found', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error('missing'); });

    await expect(getGoogleCalendarStatus()).resolves.toEqual({ available: false, loggedIn: false });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('maps an expired token during auth status to not logged in', async () => {
    nextSpawn({ code: 1, stderr: 'Token has been expired or revoked' });

    await expect(getGoogleCalendarStatus()).resolves.toEqual({ available: true, loggedIn: false });
  });

  it('normalizes all-day and timed events and drops cancelled ones', async () => {
    nextSpawn({ stdout: calendarListOutput([{ id: 'primary@example.com', selected: true }]) });
    nextSpawn({
      stdout: JSON.stringify({
        items: [
          { id: 'a1', summary: 'Trip', start: { date: '2026-11-02' }, end: { date: '2026-11-04' } },
          { id: 'b2', summary: 'Standup', start: { dateTime: '2026-11-02T09:00:00+08:00' }, end: { dateTime: '2026-11-02T09:30:00+08:00' } },
          { id: 'c3', summary: 'Gone', status: 'cancelled', start: { date: '2026-11-03' }, end: { date: '2026-11-04' } },
        ],
      }),
    });

    const events = await listGoogleCalendarEvents({ timeMin: '2026-10-31T00:00:00.000Z', timeMax: '2026-11-30T00:00:00.000Z' });

    expect(events).toEqual([
      { id: 'a1', calendarId: 'primary@example.com', color: '#112233', readOnly: false, title: 'Trip', allDay: true, start: '2026-11-02', end: '2026-11-03' },
      { id: 'b2', calendarId: 'primary@example.com', color: '#112233', readOnly: false, title: 'Standup', allDay: false, start: '2026-11-02T09:00:00+08:00', end: '2026-11-02T09:30:00+08:00' },
    ]);
    const args = lastGwsArgs();
    expect(args.slice(0, 3)).toEqual(['calendar', 'events', 'list']);
    expect(jsonArg(args, '--params')).toMatchObject({ calendarId: 'primary@example.com', singleEvents: true, orderBy: 'startTime' });
  });

  it('reads only selected, non-hidden calendars and tags events with calendar color and access', async () => {
    nextSpawn({
      stdout: calendarListOutput([
        { id: 'me@example.com', selected: true, primary: true },
        { id: 'abc123@group.calendar.google.com', selected: true, backgroundColor: '#ff0000', accessRole: 'reader' },
        { id: 'unticked@example.com' },
        { id: 'hidden@example.com', selected: true, hidden: true },
      ]),
    });
    nextSpawn({ stdout: JSON.stringify({ items: [{ id: 'a1', summary: 'Mine', start: { date: '2026-11-02' }, end: { date: '2026-11-03' } }] }) });
    nextSpawn({ stdout: JSON.stringify({ items: [{ id: 'a1', summary: 'Shift', start: { date: '2026-11-03' }, end: { date: '2026-11-04' } }] }) });

    const events = await listGoogleCalendarEvents(RANGE);

    expect(spawn).toHaveBeenCalledTimes(3);
    const listed = vi.mocked(spawn).mock.calls.slice(1).map((call) => jsonArg(call[1] as string[], '--params').calendarId);
    expect(listed).toEqual(['me@example.com', 'abc123@group.calendar.google.com']);
    // 事件 ID 在两个日历中相同，靠 calendarId 区分。
    expect(events.map((event) => [event.calendarId, event.id, event.color, event.readOnly])).toEqual([
      ['me@example.com', 'a1', '#112233', false],
      ['abc123@group.calendar.google.com', 'a1', '#ff0000', true],
    ]);
  });

  it('keeps events from healthy calendars when another calendar fails', async () => {
    nextSpawn({ stdout: calendarListOutput([{ id: 'ok@example.com', selected: true }, { id: 'bad@example.com', selected: true }]) });
    nextSpawn({ stdout: JSON.stringify({ items: [{ id: 'a1', summary: 'Fine', start: { date: '2026-11-02' }, end: { date: '2026-11-03' } }] }) });
    nextSpawn({ code: 1, stderr: 'Not Found' });

    const events = await listGoogleCalendarEvents(RANGE);

    expect(events.map((event) => event.calendarId)).toEqual(['ok@example.com']);
  });

  it('throws when every selected calendar fails', async () => {
    nextSpawn({ stdout: calendarListOutput([{ id: 'a@example.com', selected: true }, { id: 'b@example.com', selected: true }]) });
    nextSpawn({ code: 1, stderr: 'Token has been expired or revoked' });
    nextSpawn({ code: 1, stderr: 'Token has been expired or revoked' });

    await expect(listGoogleCalendarEvents(RANGE)).rejects.toMatchObject({ code: 'not-logged-in' });
  });

  it('returns no events when no calendar is selected', async () => {
    nextSpawn({ stdout: calendarListOutput([{ id: 'a@example.com' }]) });

    await expect(listGoogleCalendarEvents(RANGE)).resolves.toEqual([]);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('treats freeBusyReader and missing roles as read-only', async () => {
    nextSpawn({
      stdout: calendarListOutput([
        { id: 'w@example.com', selected: true, accessRole: 'writer' },
        { id: 'f@example.com', selected: true, accessRole: 'freeBusyReader' },
        { id: 'n@example.com', selected: true, accessRole: undefined },
      ]),
    });
    const body = JSON.stringify({ items: [{ id: 'x', start: { date: '2026-11-02' }, end: { date: '2026-11-03' } }] });
    nextSpawn({ stdout: body });
    nextSpawn({ stdout: body });
    nextSpawn({ stdout: body });

    const events = await listGoogleCalendarEvents(RANGE);

    expect(events.map((item) => item.readOnly)).toEqual([false, true, true]);
  });

  it('rejects an inverted query range without spawning', async () => {
    await expect(listGoogleCalendarEvents({ timeMin: '2026-11-30T00:00:00Z', timeMax: '2026-11-01T00:00:00Z' }))
      .rejects.toMatchObject({ code: 'invalid-input' });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('maps a timed-out gws process to network', async () => {
    nextSpawn({ signal: 'SIGTERM', code: null });

    await expect(listGoogleCalendarEvents({ timeMin: '2026-11-01T00:00:00Z', timeMax: '2026-11-02T00:00:00Z' }))
      .rejects.toMatchObject({ code: 'network' });
  });

  it('maps a missing executable to gws-missing', async () => {
    nextSpawn({ error: Object.assign(new Error('spawn gws ENOENT'), { code: 'ENOENT' }) });

    await expect(listGoogleCalendarEvents({ timeMin: '2026-11-01T00:00:00Z', timeMax: '2026-11-02T00:00:00Z' }))
      .rejects.toMatchObject({ code: 'gws-missing' });
  });

  it('creates an all-day event with an exclusive end date and returns the normalized result', async () => {
    nextSpawn({ stdout: JSON.stringify({ id: 'n1', summary: 'Holiday', start: { date: '2026-11-02' }, end: { date: '2026-11-03' } }) });

    const event = await createGoogleCalendarEvent({ title: '  Holiday  ', allDay: true, date: '2026-11-02' });

    expect(event).toEqual({ id: 'n1', calendarId: 'primary', color: '#4285f4', readOnly: false, title: 'Holiday', allDay: true, start: '2026-11-02', end: '2026-11-02' });
    const args = lastGwsArgs();
    expect(args.slice(0, 3)).toEqual(['calendar', 'events', 'insert']);
    expect(jsonArg(args, '--json')).toEqual({
      summary: 'Holiday',
      start: { date: '2026-11-02' },
      end: { date: '2026-11-03' },
    });
  });

  it('builds timed bodies with the local IANA time zone', () => {
    const body = buildEventBody({ title: 'Review', allDay: false, date: '2026-11-02', startTime: '10:00', endTime: '10:45' });

    expect(body).toMatchObject({
      summary: 'Review',
      start: { dateTime: '2026-11-02T10:00:00' },
      end: { dateTime: '2026-11-02T10:45:00' },
    });
    expect(typeof (body.start as { timeZone: unknown }).timeZone).toBe('string');
  });

  it('rejects invalid event input before spawning gws', () => {
    const invalid: unknown[] = [
      null,
      { title: '   ', allDay: true, date: '2026-11-02' },
      { title: 'x', allDay: true, date: '2026/11/02' },
      { title: 'x', allDay: false, date: '2026-11-02', startTime: '10:00', endTime: '09:00' },
      { title: 'x', allDay: false, date: '2026-11-02', startTime: '25:00', endTime: '26:00' },
    ];
    for (const input of invalid) {
      expect(() => normalizeEventInput(input)).toThrow(GoogleCalendarError);
    }
    expect(spawn).not.toHaveBeenCalled();
  });

  it('patches an event by id with the full edited fields', async () => {
    nextSpawn({ stdout: JSON.stringify({ id: 'e1', summary: 'Moved', start: { dateTime: '2026-11-02T14:00:00+08:00' }, end: { dateTime: '2026-11-02T15:00:00+08:00' } }) });

    const event = await updateGoogleCalendarEvent('team@group.calendar.google.com', 'e1', { title: 'Moved', allDay: false, date: '2026-11-02', startTime: '14:00', endTime: '15:00' });

    expect(event.title).toBe('Moved');
    const args = lastGwsArgs();
    expect(args.slice(0, 3)).toEqual(['calendar', 'events', 'patch']);
    expect(jsonArg(args, '--params')).toEqual({ calendarId: 'team@group.calendar.google.com', eventId: 'e1' });
  });

  it('refuses event ids that could escape the request path', async () => {
    await expect(updateGoogleCalendarEvent('primary', '../primary', { title: 'x', allDay: true, date: '2026-11-02' }))
      .rejects.toMatchObject({ code: 'invalid-input' });
    await expect(removeGoogleCalendarEvent('primary', 'a/b')).rejects.toMatchObject({ code: 'invalid-input' });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('refuses calendar ids that could escape the request path', async () => {
    const input = { title: 'x', allDay: true, date: '2026-11-02' };
    for (const calendarId of ['', '../primary', 'a/b', 'a b', 'a?b=c', 'a%2Fb']) {
      await expect(updateGoogleCalendarEvent(calendarId, 'e1', input)).rejects.toMatchObject({ code: 'invalid-input' });
      await expect(removeGoogleCalendarEvent(calendarId, 'e1')).rejects.toMatchObject({ code: 'invalid-input' });
    }
    expect(spawn).not.toHaveBeenCalled();
  });

  it('accepts primary, email, group and system calendar ids', async () => {
    for (const calendarId of ['primary', 'me@example.com', 'abc123@group.calendar.google.com', 'en.taiwan#holiday@group.v.calendar.google.com']) {
      nextSpawn({ stdout: '' });
      await expect(removeGoogleCalendarEvent(calendarId, 'e1')).resolves.toBeUndefined();
      expect(jsonArg(lastGwsArgs(), '--params')).toEqual({ calendarId, eventId: 'e1' });
    }
  });

  it('deletes an event and accepts the empty output gws returns on success', async () => {
    nextSpawn({ stdout: '' });

    await expect(removeGoogleCalendarEvent('primary', 'e1')).resolves.toBeUndefined();
    const args = lastGwsArgs();
    expect(args.slice(0, 3)).toEqual(['calendar', 'events', 'delete']);
    expect(jsonArg(args, '--params')).toEqual({ calendarId: 'primary', eventId: 'e1' });
  });
});
