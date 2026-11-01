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
 * @file discordNotificationWatcher.test.ts
 * @description Discord 通知监听：toast 解析、只转发新通知、停止后释放数据源
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiscordNotificationWatcher, parseToastPayload } from '../discordNotificationWatcher';
import type { NotificationStore } from '../discordNotificationWatcher';

/** 生成 toast XML */
function toast(...texts: string[]): string {
  return '<toast><visual><binding template="ToastGeneric">' + texts.map((text) => '<text>' + text + '</text>').join('') + '</binding></visual></toast>';
}

describe('parseToastPayload', () => {
  it('第一行作标题，其余合并为正文并反转义实体', () => {
    expect(parseToastPayload(Buffer.from(toast('Alice (#general)', 'a &amp; b &lt;3', 'more')))).toEqual({ title: 'Alice (#general)', body: 'a & b <3 more' });
  });

  it('没有文字或空数据时返回 null', () => {
    expect(parseToastPayload(null)).toBeNull();
    expect(parseToastPayload('<toast></toast>')).toBeNull();
  });
});

describe('createDiscordNotificationWatcher', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('启动时跳过历史通知，只把新通知发给主窗口', () => {
    const rows = [{ Id: 5, Payload: toast('old') }];
    const store: NotificationStore = {
      maxId: () => 5,
      rowsAfter: (id) => rows.filter((row) => row.Id > id),
      close: vi.fn(),
    };
    const send = vi.fn();
    const window = { isDestroyed: () => false, webContents: { send } };
    const watcher = createDiscordNotificationWatcher({ getMainWindow: () => window as never, openStore: () => store, pollIntervalMs: 1000 });
    watcher.start();
    vi.advanceTimersByTime(1000);
    expect(send).not.toHaveBeenCalled();

    rows.push({ Id: 9, Payload: toast('Bob', 'hi') });
    vi.advanceTimersByTime(1000);
    expect(send).toHaveBeenCalledWith('discord:notification', { title: 'Bob', body: 'hi' });
    vi.advanceTimersByTime(1000);
    expect(send).toHaveBeenCalledTimes(1);

    watcher.stop();
    expect(store.close).toHaveBeenCalled();
  });

  it('数据库打不开时不启动轮询', () => {
    const send = vi.fn();
    const watcher = createDiscordNotificationWatcher({ getMainWindow: () => ({ isDestroyed: () => false, webContents: { send } }) as never, openStore: () => null });
    watcher.start();
    vi.advanceTimersByTime(10000);
    expect(send).not.toHaveBeenCalled();
    watcher.stop();
  });
});
