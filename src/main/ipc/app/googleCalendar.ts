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
 * @file googleCalendar.ts
 * @description Google 日历 IPC 处理模块：把服务层结果包装为统一的 ok/错误结构
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import {
  createGoogleCalendarEvent,
  getGoogleCalendarStatus,
  GoogleCalendarError,
  listGoogleCalendarEvents,
  removeGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '../../services/googleCalendarService';
import type { GoogleCalendarRange, GoogleCalendarResult } from '../../../shared/googleCalendarTypes';

/**
 * 执行服务调用并把异常转换为统一结构
 * @description 错误消息只保留固定的英文说明，避免 gws 输出中的用户数据经 IPC 外泄。
 * @param task - 服务层调用
 * @returns 成功时携带数据，失败时携带错误类别
 */
async function runTask<T>(task: () => Promise<T>): Promise<GoogleCalendarResult<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: 'unknown', message: 'Google Calendar request failed' };
  }
}

/**
 * 注册 Google 日历相关的 IPC 处理器
 * @description 渲染进程只能通过这些通道间接调用 gws，不会收到任何凭据。
 */
export function registerGoogleCalendarIpcHandlers(): void {
  ipcMain.handle('gcal:status', () => runTask(() => getGoogleCalendarStatus()));
  ipcMain.handle('gcal:list', (_event, range: unknown) => runTask(() => listGoogleCalendarEvents(range as GoogleCalendarRange)));
  ipcMain.handle('gcal:create', (_event, input: unknown) => runTask(() => createGoogleCalendarEvent(input)));
  ipcMain.handle('gcal:update', (_event, id: unknown, input: unknown) => runTask(() => updateGoogleCalendarEvent(typeof id === 'string' ? id : '', input)));
  ipcMain.handle('gcal:remove', (_event, id: unknown) => runTask(async () => {
    await removeGoogleCalendarEvent(typeof id === 'string' ? id : '');
    return null;
  }));
}
