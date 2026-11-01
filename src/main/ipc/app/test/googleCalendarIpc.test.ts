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
 * @file googleCalendarIpc.test.ts
 * @description Google 日历 IPC 处理器测试：验证统一返回结构与错误脱敏
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { GoogleCalendarError, removeGoogleCalendarEvent, listGoogleCalendarEvents } from '../../../services/googleCalendarService';
import { registerGoogleCalendarIpcHandlers } from '../googleCalendar';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock('../../../services/googleCalendarService', () => ({
  GoogleCalendarError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  getGoogleCalendarStatus: vi.fn(),
  listGoogleCalendarEvents: vi.fn(),
  createGoogleCalendarEvent: vi.fn(),
  updateGoogleCalendarEvent: vi.fn(),
  removeGoogleCalendarEvent: vi.fn(),
}));

/**
 * 取得已注册的 IPC 处理器
 * @param channel - IPC 通道名
 * @returns 处理函数
 */
function handlerFor(channel: string): (...args: unknown[]) => Promise<unknown> {
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([name]) => name === channel);
  if (!call) throw new Error(`handler ${channel} was not registered`);
  return call[1] as (...args: unknown[]) => Promise<unknown>;
}

describe('googleCalendar IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerGoogleCalendarIpcHandlers();
  });

  it('wraps a successful remove as ok with null data', async () => {
    vi.mocked(removeGoogleCalendarEvent).mockResolvedValue(undefined);

    await expect(handlerFor('gcal:remove')({}, 'e1')).resolves.toEqual({ ok: true, data: null });
  });

  it('returns the typed error code from the service', async () => {
    vi.mocked(listGoogleCalendarEvents).mockRejectedValue(new GoogleCalendarError('not-logged-in', 'gws exited with code 1'));

    await expect(handlerFor('gcal:list')({}, { timeMin: 'a', timeMax: 'b' })).resolves.toEqual({
      ok: false,
      code: 'not-logged-in',
      message: 'gws exited with code 1',
    });
  });

  it('hides unexpected error text behind a fixed message', async () => {
    vi.mocked(removeGoogleCalendarEvent).mockRejectedValue(new Error('raw gws output with event title'));

    const result = await handlerFor('gcal:remove')({}, 'e1');

    expect(result).toEqual({ ok: false, code: 'unknown', message: 'Google Calendar request failed' });
  });

  it('treats a non-string event id as an invalid empty id', async () => {
    vi.mocked(removeGoogleCalendarEvent).mockRejectedValue(new GoogleCalendarError('invalid-input', 'event id is invalid'));

    await expect(handlerFor('gcal:remove')({}, 42)).resolves.toMatchObject({ ok: false, code: 'invalid-input' });
    expect(removeGoogleCalendarEvent).toHaveBeenCalledWith('');
  });
});
