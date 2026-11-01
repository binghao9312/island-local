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
 * @file maxExpandContentEager.test.tsx
 * @description MaxExpandContentEager 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { MaxExpandContentEager as Component } from '../MaxExpandContentEager';
import { MaxExpandContentShell } from '../MaxExpandContentShell';
import { AcpChatTab } from '../components/acpChat';
import { SettingsTab } from '../components/setting';
import { render, value } from './componentHarness';
vi.mock('../components/acpChat', () => ({ AcpChatTab: () => null }));
vi.mock('../components/setting', () => ({ SettingsTab: () => null }));
describe('MaxExpandContentEager', () => {
  const cases = [['aiChat', AcpChatTab], ['settings', SettingsTab]] as const;
  it.each(cases)('renders the real routing branch for %s', (tab, child) => {
    const tree = render(Component);
    const renderActiveTab = value(tree, MaxExpandContentShell, 'renderActiveTab') as (tab: string, fallback: ReactElement, ready: boolean) => ReactElement | null;
    const fallback = createElement('span', {}, 'Loading');
    expect(renderActiveTab(tab, fallback, false)).toBe(fallback);
    expect(renderActiveTab(tab, fallback, true)?.type).toBe(child);
    expect(renderActiveTab('unknown', fallback, true)).toBeNull();
    expect(value(tree, MaxExpandContentShell, 'deferContent')).toBe(false);
  });
});

vi.mock('../MaxExpandContentShell', () => ({ MaxExpandContentShell: () => null }));
