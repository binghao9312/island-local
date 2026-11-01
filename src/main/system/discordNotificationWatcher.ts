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
 * @file discordNotificationWatcher.ts
 * @description 读取 Windows 本机通知数据库，把 Discord 桌面端的新通知转发到灵动岛
 * @author 鸡哥
 */

import { join } from 'path';
import { DatabaseSync } from 'node:sqlite';
import type { BrowserWindow } from 'electron';
import type { DiscordNotificationPayload } from '../../shared/discordNotificationTypes';

/** Discord 桌面端在 Windows 通知中心注册的应用 ID */
const DISCORD_HANDLER_ID = 'com.squirrel.Discord.Discord';

/** 默认轮询间隔（毫秒） */
const DEFAULT_POLL_INTERVAL_MS = 2000;

/** 通知行：Id 递增，Payload 为 toast XML */
interface NotificationRow {
  Id: number;
  Payload: Uint8Array | string | null;
}

/** 只读查询接口，便于测试替换 */
export interface NotificationStore {
  maxId: () => number;
  rowsAfter: (id: number) => NotificationRow[];
  close: () => void;
}

interface CreateDiscordNotificationWatcherOptions {
  getMainWindow: () => BrowserWindow | null;
  openStore?: () => NotificationStore | null;
  pollIntervalMs?: number;
}

export interface DiscordNotificationWatcherService {
  start: () => void;
  stop: () => void;
}

/** XML 实体反转义 */
function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

/**
 * 解析 toast XML，第一行 text 作标题，其余合并为正文
 * @param payload - 通知数据库中的 Payload 字段
 * @returns 标题与正文，无文字时返回 null
 */
export function parseToastPayload(payload: Uint8Array | string | null): DiscordNotificationPayload | null {
  if (!payload) return null;
  const xml = typeof payload === 'string' ? payload : Buffer.from(payload).toString('utf8');
  const texts = [...xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean);
  if (texts.length === 0) return null;
  return { title: texts[0], body: texts.slice(1).join(' ') };
}

/** 打开 Windows 通知数据库（只读），失败时返回 null */
function openWindowsNotificationStore(): NotificationStore | null {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  try {
    const db = new DatabaseSync(join(localAppData, 'Microsoft', 'Windows', 'Notifications', 'wpndatabase.db'), { readOnly: true });
    const baseSql = 'FROM Notification n JOIN NotificationHandler h ON h.RecordId = n.HandlerId WHERE h.PrimaryId = ? AND n.Type = \'toast\'';
    const maxStmt = db.prepare(`SELECT COALESCE(MAX(n.Id), 0) AS id ${baseSql}`);
    const rowsStmt = db.prepare(`SELECT n.Id AS Id, n.Payload AS Payload ${baseSql} AND n.Id > ? ORDER BY n.Id`);
    return {
      maxId: () => Number((maxStmt.get(DISCORD_HANDLER_ID) as { id: number }).id),
      rowsAfter: (id) => rowsStmt.all(DISCORD_HANDLER_ID, id) as unknown as NotificationRow[],
      close: () => db.close(),
    };
  } catch {
    return null;
  }
}

/**
 * 创建 Discord 通知监听器
 * @description 启动时记下现有最大 Id，之后只转发新到的通知，不重放历史
 * @param options - 主窗口获取函数、可替换的数据源与轮询间隔
 * @returns 启停控制
 */
export function createDiscordNotificationWatcher(options: CreateDiscordNotificationWatcherOptions): DiscordNotificationWatcherService {
  const openStore = options.openStore ?? openWindowsNotificationStore;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let store: NotificationStore | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastId = 0;

  function poll(): void {
    if (!store) return;
    let rows: NotificationRow[];
    try {
      rows = store.rowsAfter(lastId);
    } catch {
      return;
    }
    for (const row of rows) {
      lastId = Math.max(lastId, Number(row.Id));
      const parsed = parseToastPayload(row.Payload);
      const mainWindow = options.getMainWindow();
      if (parsed && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discord:notification', parsed);
      }
    }
  }

  function start(): void {
    if (timer) return;
    store = openStore();
    if (!store) return;
    try {
      lastId = store.maxId();
    } catch {
      lastId = 0;
    }
    timer = setInterval(poll, pollIntervalMs);
  }

  function stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
    store?.close();
    store = null;
  }

  return { start, stop };
}
