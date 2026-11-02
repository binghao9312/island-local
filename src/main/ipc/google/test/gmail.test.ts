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
 * @file gmail.test.ts
 * @description Gmail 新邮件提醒 IPC 测试：开关默认值、持久化、服务启停与状态查询
 * @author 鸡哥
 */

import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const io = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  files: new Map<string, string>(),
  gwsFound: { value: true },
  write: vi.fn(),
  openLogin: vi.fn(() => 'opened'),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: unknown[]) => unknown) => { io.handlers.set(channel, fn); } },
}));
vi.mock('fs', () => ({
  existsSync: (path: string) => io.files.has(path),
  readFileSync: (path: string) => io.files.get(path) ?? '',
  writeFileSync: (path: string, data: string) => io.write(path, data),
}));
vi.mock('../../../google/gwsRunner', () => ({
  openGwsLoginTerminal: () => io.openLogin(),
  resolveGwsBinary: () => (io.gwsFound.value ? 'C:\\npm\\gws.exe' : null),
}));

import { isGmailRemindersEnabled, registerGmailIpcHandlers } from '../gmail';
import type { GmailReminderStatus } from '../../../../shared/gmailReminderTypes';

const STORE_DIR = 'C:/store';
const KEY = 'gmail-reminders-enabled';
const FILE = join(STORE_DIR, `${KEY}.json`);

const service = {
  start: vi.fn<() => void>(),
  stop: vi.fn<() => void>(),
  checkNow: vi.fn((): Promise<GmailReminderStatus> => Promise.resolve({ kind: 'ok', checkedAt: 5 })),
  getStatus: vi.fn((): GmailReminderStatus => ({ kind: 'disabled', checkedAt: null })),
};

/**
 * 调用已注册的 IPC 处理器。
 * @param channel - 通道名
 * @param args - 参数
 * @returns 处理器结果
 */
function invoke(channel: string, ...args: unknown[]): unknown {
  return (io.handlers.get(channel) as Handler)({}, ...args);
}

beforeEach(() => {
  io.handlers.clear();
  io.files.clear();
  io.gwsFound.value = true;
  io.write.mockReset();
  service.start.mockClear();
  service.stop.mockClear();
  service.checkNow.mockClear();
  registerGmailIpcHandlers({ storeDir: STORE_DIR, enabledStoreKey: KEY, service });
});

describe('isGmailRemindersEnabled', () => {
  it('defaults to on when gws is found and no value is stored', () => {
    expect(isGmailRemindersEnabled(STORE_DIR, KEY)).toBe(true);
  });

  it('defaults to off when gws is not found and no value is stored', () => {
    io.gwsFound.value = false;
    expect(isGmailRemindersEnabled(STORE_DIR, KEY)).toBe(false);
  });

  it.each([
    ['true', true],
    ['false', false],
    ['"yes"', true],
    ['{broken', true],
  ])('reads stored %s as %s (non-boolean or broken values fall back to the gws default)', (stored, expected) => {
    io.files.set(FILE, stored);
    expect(isGmailRemindersEnabled(STORE_DIR, KEY)).toBe(expected);
  });
});

describe('gmail IPC handlers', () => {
  it('returns the effective enabled flag from the get channel', () => {
    io.files.set(FILE, 'false');
    expect(invoke('gmail:reminders-enabled:get')).toBe(false);
  });

  it('persists the flag and starts the service when enabled', () => {
    expect(invoke('gmail:reminders-enabled:set', true)).toBe(true);
    expect(io.write).toHaveBeenCalledWith(FILE, 'true');
    expect(service.start).toHaveBeenCalledOnce();
    expect(service.stop).not.toHaveBeenCalled();
  });

  it('persists the flag and stops the service when disabled', () => {
    expect(invoke('gmail:reminders-enabled:set', false)).toBe(true);
    expect(io.write).toHaveBeenCalledWith(FILE, 'false');
    expect(service.stop).toHaveBeenCalledOnce();
    expect(service.start).not.toHaveBeenCalled();
  });

  it('does not change the service when persistence fails', () => {
    io.write.mockImplementation(() => { throw new Error('disk full'); });
    expect(invoke('gmail:reminders-enabled:set', true)).toBe(false);
    expect(service.start).not.toHaveBeenCalled();
  });

  it('runs a manual check through the service and returns its status', async () => {
    await expect(invoke('gmail:check-now')).resolves.toEqual({ kind: 'ok', checkedAt: 5 });
    expect(service.checkNow).toHaveBeenCalledOnce();
  });

  it('returns the current status from the status channel', () => {
    expect(invoke('gmail:status:get')).toEqual({ kind: 'disabled', checkedAt: null });
  });

  it('opens the gws login terminal through the login channel', () => {
    expect(invoke('google:open-login')).toBe('opened');
    expect(io.openLogin).toHaveBeenCalledOnce();
  });
});
