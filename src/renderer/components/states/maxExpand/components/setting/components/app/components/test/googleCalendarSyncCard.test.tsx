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
 * @file googleCalendarSyncCard.test.tsx
 * @description Google 日历同步设置卡片测试：默认值跟随 gws 可用性、开关持久化与缺失提示
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  storeRead: vi.fn(),
  storeWrite: vi.fn(),
  gcalStatus: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('window', { api });
});

import { flushEffects, render, nodes, text, trigger } from '../../../../../../test/componentHarness';
import { GoogleCalendarSyncCard } from '../GoogleCalendarSyncCard';

/**
 * 让已排队的 Promise 回调全部执行完毕
 * @returns 微任务队列清空后完成
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

/**
 * 渲染卡片并执行挂载副作用，随后等待异步读取完成再重绘
 * @returns 重绘后的元素树
 */
async function mountCard() {
  flushEffects();
  await settle();
  return render(GoogleCalendarSyncCard);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.storeWrite.mockResolvedValue(true);
});

describe('GoogleCalendarSyncCard', () => {
  it('stays neutral before the status is known so no missing hint flashes', () => {
    const tree = render(GoogleCalendarSyncCard);

    expect(nodes(tree, 'input')[0].props.checked).toBe(false);
    expect(nodes(tree, '.settings-card-subtitle')).toHaveLength(1);
  });

  it('defaults to on when gws is available and no preference was saved', async () => {
    api.storeRead.mockResolvedValue(undefined);
    api.gcalStatus.mockResolvedValue({ ok: true, data: { available: true, loggedIn: true } });

    const tree = await mountCard();

    expect(nodes(tree, 'input')[0].props.checked).toBe(true);
    expect(text(tree)).not.toContain('expanded.calendar.google.missing');
  });

  it('respects a saved preference over gws availability', async () => {
    api.storeRead.mockResolvedValue(false);
    api.gcalStatus.mockResolvedValue({ ok: true, data: { available: true, loggedIn: true } });

    const tree = await mountCard();

    expect(nodes(tree, 'input')[0].props.checked).toBe(false);
  });

  it('shows the missing hint and stays off when gws is not installed', async () => {
    api.storeRead.mockResolvedValue(undefined);
    api.gcalStatus.mockResolvedValue({ ok: true, data: { available: false, loggedIn: false } });

    const tree = await mountCard();

    expect(nodes(tree, 'input')[0].props.checked).toBe(false);
    expect(text(tree)).toContain('expanded.calendar.google.missing');
  });

  it('persists the toggle under the shared store key', async () => {
    api.storeRead.mockResolvedValue(undefined);
    api.gcalStatus.mockResolvedValue({ ok: true, data: { available: true, loggedIn: true } });
    const tree = await mountCard();

    trigger(tree, 'input', 'onChange', { target: { checked: false } });

    expect(api.storeWrite).toHaveBeenCalledWith('google-calendar-sync', false);
  });
});
