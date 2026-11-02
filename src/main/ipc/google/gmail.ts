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
 * @file gmail.ts
 * @description Gmail 新邮件提醒 IPC 处理器：开关持久化、立即检查与状态查询
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { openGwsLoginTerminal, resolveGwsBinary } from '../../google/gwsRunner';
import type { GmailReminderService } from '../../google/gmailService';

/** Gmail 新邮件提醒 IPC 注册依赖 */
interface RegisterGmailIpcHandlersOptions {
  storeDir: string;
  enabledStoreKey: string;
  service: GmailReminderService;
}

/**
 * 读取 Gmail 提醒开关。未保存过时默认开启当且仅当找到 gws。
 * @param storeDir - 存储目录
 * @param enabledStoreKey - 开关存储键名
 * @returns 是否启用 Gmail 新邮件提醒
 */
export function isGmailRemindersEnabled(storeDir: string, enabledStoreKey: string): boolean {
  const filePath = join(storeDir, `${enabledStoreKey}.json`);
  try {
    if (!existsSync(filePath)) return resolveGwsBinary() !== null;
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return typeof data === 'boolean' ? data : resolveGwsBinary() !== null;
  } catch {
    return resolveGwsBinary() !== null;
  }
}

/**
 * 注册 Gmail 新邮件提醒相关的 IPC 处理器。
 * @param options - 存储目录、开关键名与提醒服务实例
 */
export function registerGmailIpcHandlers(options: RegisterGmailIpcHandlersOptions): void {
  ipcMain.handle('gmail:reminders-enabled:get', () => isGmailRemindersEnabled(options.storeDir, options.enabledStoreKey));

  ipcMain.handle('gmail:reminders-enabled:set', (_event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.enabledStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GmailReminders] persist error:', err);
      return false;
    }
    if (enabled) options.service.start();
    else options.service.stop();
    return true;
  });

  ipcMain.handle('gmail:check-now', () => options.service.checkNow());

  ipcMain.handle('gmail:status:get', () => options.service.getStatus());

  ipcMain.handle('google:open-login', () => openGwsLoginTerminal());
}
