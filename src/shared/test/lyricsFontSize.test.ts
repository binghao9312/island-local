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
 * @file lyricsFontSize.test.ts
 * @description 歌词字号净化函数的边界与回退测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { LYRICS_FONT_SIZE_DEFAULT, LYRICS_FONT_SIZE_MAX, LYRICS_FONT_SIZE_MIN, sanitizeLyricsFontSize } from '../lyricsFontSize';

describe('sanitizeLyricsFontSize', () => {
  it('keeps in-range integers unchanged', () => {
    expect(sanitizeLyricsFontSize(18)).toBe(18);
  });

  it('rounds fractional values to the nearest integer', () => {
    expect(sanitizeLyricsFontSize(20.4)).toBe(20);
    expect(sanitizeLyricsFontSize(20.6)).toBe(21);
  });

  it('clamps values below the minimum and above the maximum', () => {
    expect(sanitizeLyricsFontSize(1)).toBe(LYRICS_FONT_SIZE_MIN);
    expect(sanitizeLyricsFontSize(-5)).toBe(LYRICS_FONT_SIZE_MIN);
    expect(sanitizeLyricsFontSize(999)).toBe(LYRICS_FONT_SIZE_MAX);
  });

  it('returns the fallback for non-numeric or non-finite input', () => {
    expect(sanitizeLyricsFontSize('18')).toBe(LYRICS_FONT_SIZE_DEFAULT);
    expect(sanitizeLyricsFontSize(null)).toBe(LYRICS_FONT_SIZE_DEFAULT);
    expect(sanitizeLyricsFontSize(Number.NaN)).toBe(LYRICS_FONT_SIZE_DEFAULT);
    expect(sanitizeLyricsFontSize(Number.POSITIVE_INFINITY)).toBe(LYRICS_FONT_SIZE_DEFAULT);
  });

  it('uses a caller-provided fallback when input is invalid', () => {
    expect(sanitizeLyricsFontSize(undefined, 22)).toBe(22);
  });
});
