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
 * @file compactCalendarWeeks.test.ts
 * @description 展开日历最多 5 行周视图的单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { COMPACT_CALENDAR_MAX_WEEKS, getCompactCalendarWeeks } from '../compactCalendarWeeks';

/** 把周矩阵转成「日」数字，非当月填 0，方便断言 */
function toDayGrid(weeks: Date[][], monthIndex: number): number[][] {
  return weeks.map((week) => week.map((date) => (date.getMonth() === monthIndex ? date.getDate() : 0)));
}

describe('getCompactCalendarWeeks', () => {
  it('keeps a 5-row month unchanged', () => {
    const weeks = getCompactCalendarWeeks(new Date(2026, 10, 15, 12));
    expect(weeks).toHaveLength(5);
    expect(toDayGrid(weeks, 10)[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('folds 6-row month overflow into the first row', () => {
    // 2026-08-01 是周六，原本需要 6 行；30、31 日折到第一行周日、周一
    const weeks = getCompactCalendarWeeks(new Date(2026, 7, 10, 12));
    expect(weeks).toHaveLength(COMPACT_CALENDAR_MAX_WEEKS);
    const grid = toDayGrid(weeks, 7);
    expect(grid[0]).toEqual([30, 31, 0, 0, 0, 0, 1]);
    expect(grid.flat().filter((day) => day > 0).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1),
    );
  });

  it('returns 4 rows for a February that starts on Sunday', () => {
    expect(getCompactCalendarWeeks(new Date(2026, 1, 1, 12))).toHaveLength(4);
  });
});
