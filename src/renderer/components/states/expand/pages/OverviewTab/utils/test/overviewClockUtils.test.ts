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
 * @file overviewClockUtils.test.ts
 * @description 总览时钟配置规范化、时间与日期格式化及样式生成单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERVIEW_CLOCK_CONFIG } from '../../config/overviewConfig';
import {
  buildOverviewClockStyle,
  buildPreviewClockStyle,
  formatOverviewDate,
  formatOverviewTime,
  normalizeOverviewClockConfig,
} from '../overviewClockUtils';

describe('overviewClockUtils', () => {
  describe('normalizeOverviewClockConfig', () => {
    it('returns default config when input is non-object', () => {
      expect(normalizeOverviewClockConfig(null)).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);
      expect(normalizeOverviewClockConfig(undefined)).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);
      expect(normalizeOverviewClockConfig('invalid')).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);
      expect(normalizeOverviewClockConfig(42)).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);
    });

    it('retains valid properties and falls back on invalid ones', () => {
      const custom = {
        colorMode: 'solid' as const,
        solidColor: '#112233',
        gradientStart: '#445566',
        gradientEnd: '#778899',
        fontFamily: 'consolas' as const,
        fontWeight: 'light' as const,
        fontSize: 'small' as const,
        showSeconds: true,
        is24Hour: false,
        showDate: false,
        dateFormat: 'slash' as const,
      };
      expect(normalizeOverviewClockConfig(custom)).toEqual(custom);

      const invalid = {
        colorMode: 'unknown',
        solidColor: 'red',
        gradientStart: '#123',
        gradientEnd: 'not-hex',
        fontFamily: 'Comic Sans',
        fontWeight: 'ultra-bold',
        fontSize: 'gigantic',
        showSeconds: 'yes',
        is24Hour: 0,
        showDate: null,
        dateFormat: 'iso',
      };
      expect(normalizeOverviewClockConfig(invalid)).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);
    });
  });

  describe('formatOverviewDate', () => {
    const date = new Date(2026, 10, 1); // 2026-11-01 (Sunday)
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'overview.time.weekdays.0') return '週日';
      if (key === 'overview.time.date') return `${opts?.yyyy}年${opts?.month}月${opts?.day}日 ${opts?.dayName}`;
      if (key === 'settings.app.layout.clock.dateFormats.shortVal') return `${opts?.month}/${opts?.day} ${opts?.dayName}`;
      return key;
    };

    it('formats date as slash format', () => {
      expect(formatOverviewDate(date, 'slash', t)).toBe('2026/11/01');
    });

    it('formats date as short format', () => {
      expect(formatOverviewDate(date, 'short', t)).toBe('11/01 週日');
    });

    it('formats date as full format', () => {
      expect(formatOverviewDate(date, 'full', t)).toBe('2026年11月01日 週日');
    });
  });

  describe('formatOverviewTime', () => {
    const evening = new Date(2026, 10, 1, 23, 50, 42);
    const morning = new Date(2026, 10, 1, 9, 5, 8);

    it('formats 24-hour time without seconds', () => {
      expect(formatOverviewTime(evening, true, false)).toBe('23:50');
      expect(formatOverviewTime(morning, true, false)).toBe('09:05');
    });

    it('formats 24-hour time with seconds', () => {
      expect(formatOverviewTime(evening, true, true)).toBe('23:50:42');
      expect(formatOverviewTime(morning, true, true)).toBe('09:05:08');
    });

    it('formats 12-hour time without seconds', () => {
      expect(formatOverviewTime(evening, false, false)).toBe('11:50 PM');
      expect(formatOverviewTime(morning, false, false)).toBe('09:05 AM');
    });

    it('formats 12-hour time with seconds', () => {
      expect(formatOverviewTime(evening, false, true)).toBe('11:50:42 PM');
      expect(formatOverviewTime(morning, false, true)).toBe('09:05:08 AM');
    });
  });

  describe('buildOverviewClockStyle', () => {
    it('builds style for solid color mode', () => {
      const config = { ...DEFAULT_OVERVIEW_CLOCK_CONFIG, colorMode: 'solid' as const, solidColor: '#334455' };
      const { clockStyle } = buildOverviewClockStyle(config);
      expect(clockStyle.color).toBe('#334455');
      expect(clockStyle.WebkitTextFillColor).toBe('#334455');
      expect(clockStyle.backgroundImage).toBe('none');
    });

    it('builds style for gradient color mode', () => {
      const config = {
        ...DEFAULT_OVERVIEW_CLOCK_CONFIG,
        colorMode: 'gradient' as const,
        gradientStart: '#111111',
        gradientEnd: '#222222',
      };
      const { clockStyle } = buildOverviewClockStyle(config);
      expect(clockStyle.backgroundImage).toContain('linear-gradient');
      expect(clockStyle.backgroundImage).toContain('#111111');
      expect(clockStyle.backgroundImage).toContain('#222222');
      expect(clockStyle.WebkitTextFillColor).toBe('transparent');
    });

    it('builds style for album color mode when dominant color is present', () => {
      const config = { ...DEFAULT_OVERVIEW_CLOCK_CONFIG, colorMode: 'album' as const };
      const { clockStyle } = buildOverviewClockStyle(config, [255, 128, 64]);
      expect(clockStyle.color).toBe('rgb(255, 128, 64)');
      expect(clockStyle.WebkitTextFillColor).toBe('rgb(255, 128, 64)');
    });

    it('falls back when album dominant color is absent', () => {
      const config = { ...DEFAULT_OVERVIEW_CLOCK_CONFIG, colorMode: 'album' as const };
      const { clockStyle } = buildOverviewClockStyle(config, null);
      expect(clockStyle.color).toBeUndefined();
    });

    it('applies selected font family, font weight, and font size', () => {
      const config = {
        ...DEFAULT_OVERVIEW_CLOCK_CONFIG,
        fontFamily: 'bahnschrift' as const,
        fontWeight: 'heavy' as const,
        fontSize: 'small' as const,
      };
      const { clockStyle } = buildOverviewClockStyle(config);
      expect(clockStyle.fontFamily).toContain('Bahnschrift');
      expect(clockStyle.fontWeight).toBe(900);
      expect(clockStyle.fontSize).toBe('32px');
    });
  });

  describe('buildPreviewClockStyle', () => {
    it('returns scaled font size for preview box', () => {
      const config = { ...DEFAULT_OVERVIEW_CLOCK_CONFIG, fontSize: 'xlarge' as const };
      const { clockStyle } = buildPreviewClockStyle(config);
      expect(Number.parseInt(String(clockStyle.fontSize), 10)).toBeLessThan(72);
    });
  });
});
