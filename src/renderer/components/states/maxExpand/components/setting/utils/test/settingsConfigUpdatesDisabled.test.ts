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
 * @file settingsConfigUpdatesDisabled.test.ts
 * @description 更新总开关关闭时，设置导航卡与搜索项不再包含更新页入口的测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { NAV_CARDS, NAV_CARDS_MAP, SEARCHABLE_SETTINGS } from '../settingsConfig';

describe('settings entries with UPDATES_ENABLED=false', () => {
  it('hides every navigation card and search item that points at the update page', () => {
    expect(NAV_CARDS.some((card) => card.tab === 'update')).toBe(false);
    expect(NAV_CARDS_MAP.has('update')).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'update')).toBe(false);
  });

  it('hides the network update source search item but keeps the static asset node one', () => {
    expect(SEARCHABLE_SETTINGS.some((item) => item.labelKey?.startsWith('settings.network.updateSource.'))).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.labelKey === 'settings.network.staticAssetNode.title')).toBe(true);
  });

  it('keeps the other settings entries', () => {
    expect(NAV_CARDS.some((card) => card.tab === 'about')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'music')).toBe(true);
  });
});
