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
 * @file settingsConfigServerDisabled.test.ts
 * @description 云端与账户总开关关闭时，设置导航卡、搜索项与页签规范化回退测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  NAV_CARDS,
  NAV_CARDS_MAP,
  SEARCHABLE_SETTINGS,
  normalizeSettingsTab,
} from '../settingsConfig';

describe('settings entries with SERVER_FEATURES_ENABLED=false', () => {
  it('hides user account and plugin market navigation cards', () => {
    expect(NAV_CARDS.some((card) => card.tab === 'user')).toBe(false);
    expect(NAV_CARDS.some((card) => card.tab === 'pluginMarket')).toBe(false);
    expect(NAV_CARDS.some((card) => card.id === 'user-pro')).toBe(false);
    expect(NAV_CARDS.some((card) => card.id === 'user-recharge')).toBe(false);
    expect(NAV_CARDS.some((card) => card.id === 'user')).toBe(false);
    expect(NAV_CARDS.some((card) => card.id === 'pluginMarket')).toBe(false);
    expect(NAV_CARDS_MAP.has('user')).toBe(false);
    expect(NAV_CARDS_MAP.has('user-pro')).toBe(false);
    expect(NAV_CARDS_MAP.has('user-recharge')).toBe(false);
    expect(NAV_CARDS_MAP.has('pluginMarket')).toBe(false);
  });

  it('hides user account, questionnaire and plugin market search items', () => {
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'user')).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'pluginMarket')).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.actionId === 'user-questionnaire')).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.labelKey?.startsWith('settings.user.'))).toBe(false);
    expect(SEARCHABLE_SETTINGS.some((item) => item.labelKey?.startsWith('settings.pluginMarket.'))).toBe(false);
  });

  it('preserves offline local feature navigation cards and searchable settings', () => {
    expect(NAV_CARDS.some((card) => card.tab === 'app')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'network')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'mail')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'weather')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'music')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'shortcut')).toBe(true);
    expect(NAV_CARDS.some((card) => card.tab === 'about')).toBe(true);

    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'app')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'network')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'mail')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'weather')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'music')).toBe(true);
    expect(SEARCHABLE_SETTINGS.some((item) => item.tab === 'shortcut')).toBe(true);
  });

  describe('normalizeSettingsTab', () => {
    it.each([
      'user',
      'pluginMarket',
      'update',
    ] as const)('falls back from hidden tab "%s" to "index"', (hiddenTab) => {
      expect(normalizeSettingsTab(hiddenTab)).toBe('index');
    });

    it.each([
      'app',
      'network',
      'mail',
      'weather',
      'music',
      'shortcut',
      'about',
    ] as const)('preserves supported tab "%s"', (tab) => {
      expect(normalizeSettingsTab(tab)).toBe(tab);
    });

    it.each([
      null,
      undefined,
      123,
      {},
      [],
      '',
      'invalid-tab',
    ])('falls back from invalid tab input %j to "index"', (input) => {
      expect(normalizeSettingsTab(input)).toBe('index');
    });

    it('allows "user" and "pluginMarket" tabs when serverFeaturesEnabled is explicitly true', () => {
      expect(normalizeSettingsTab('user', true)).toBe('user');
      expect(normalizeSettingsTab('pluginMarket', true)).toBe('pluginMarket');
    });
  });
});
