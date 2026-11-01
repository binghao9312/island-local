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
 * @file songUtils.test.ts
 * @description Expanded 歌曲 Tab 工具函数测试：歌词切片、行索引二分查找、逐字进度及倒计时格式化
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  findCurrentIndex,
  formatCountdownRemaining,
  getSyllableProgress,
  sliceNearby,
} from '../songUtils';
import type { SyncedLyricLine } from '../../../../../../../store/types';
import type { Translate } from '../../types/songTypes';

describe('songUtils', () => {
  const sampleLyrics: SyncedLyricLine[] = [
    { time_ms: 1000, text: 'First line' },
    { time_ms: 3000, text: 'Second line' },
    { time_ms: 5000, text: 'Third line' },
  ];

  describe('findCurrentIndex', () => {
    it('posMs 小于第一行时返回 -1', () => {
      expect(findCurrentIndex(sampleLyrics, 500)).toBe(-1);
    });

    it('posMs 处于区间内返回对应行索引', () => {
      expect(findCurrentIndex(sampleLyrics, 1000)).toBe(0);
      expect(findCurrentIndex(sampleLyrics, 2500)).toBe(0);
      expect(findCurrentIndex(sampleLyrics, 3000)).toBe(1);
      expect(findCurrentIndex(sampleLyrics, 6000)).toBe(2);
    });
  });

  describe('sliceNearby', () => {
    it('展示当前行高亮与下一行暗淡，仅两行', () => {
      const sliced = sliceNearby(sampleLyrics, 0);
      expect(sliced).toHaveLength(2);
      expect(sliced[0]).toEqual({ text: 'First line', isCurrent: true, key: '0' });
      expect(sliced[1]).toEqual({ text: 'Second line', isCurrent: false, key: '1' });
    });

    it('最后一行时下一行补空行', () => {
      const sliced = sliceNearby(sampleLyrics, 2);
      expect(sliced).toHaveLength(2);
      expect(sliced[0]).toEqual({ text: 'Third line', isCurrent: true, key: '2' });
      expect(sliced[1]).toEqual({ text: '', isCurrent: false, key: 'pad_next' });
    });

    it('越界索引时补空行', () => {
      const sliced = sliceNearby(sampleLyrics, -1);
      expect(sliced).toHaveLength(2);
      expect(sliced[0]).toEqual({ text: '', isCurrent: true, key: 'pad_current' });
      expect(sliced[1]).toEqual({ text: 'First line', isCurrent: false, key: '0' });
    });
  });

  describe('getSyllableProgress', () => {
    it('正确计算音节播放进度', () => {
      const syllable = { text: 'word', start_offset_ms: 100, duration_ms: 400 };
      const lineStart = 1000;
      expect(getSyllableProgress(syllable, lineStart, 1050)).toBe(0);
      expect(getSyllableProgress(syllable, lineStart, 1300)).toBeCloseTo(0.5);
      expect(getSyllableProgress(syllable, lineStart, 1600)).toBe(1);
    });
  });

  describe('formatCountdownRemaining', () => {
    it('格式化剩余天数或时分', () => {
      const t: Translate = (key: string, options?: Record<string, unknown>) => {
        if (key === 'songTab.countdown.dayHour') return `${options?.days}天${options?.hours}小时`;
        return key;
      };
      const future = new Date(Date.now() + (3 * 24 + 5) * 3600 * 1000 + 10_000).toISOString();
      expect(formatCountdownRemaining(future, t)).toBe('3天5小时');
    });
  });
});
