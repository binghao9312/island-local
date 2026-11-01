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
 * @file compactCalendarWeeks.ts
 * @description 展开日历月视图的周行计算，最多保留 5 行
 * @author 鸡哥
 */

import { getCalendarWeeks } from '../../../../maxExpand/components/calendar/utils/calendarUtils';

/** 展开日历月视图允许的最大行数 */
export const COMPACT_CALENDAR_MAX_WEEKS = 5;

/**
 * 取得当月需要显示的周行，超过 5 行时把月末溢出的日期折入第一行前导空格
 * @param month - 目标月份内的任意日期
 * @returns 每行 7 天的日期矩阵，非当月日期由调用方渲染为空格
 */
export function getCompactCalendarWeeks(month: Date): Date[][] {
  const monthIndex = month.getMonth();
  const weeks = getCalendarWeeks(month).filter((week) =>
    week.some((date) => date.getMonth() === monthIndex),
  );
  if (weeks.length <= COMPACT_CALENDAR_MAX_WEEKS) {
    return weeks;
  }

  // 6 行的月份，第 6 行的当月日期所在列一定是第一行的前导空格，按列折叠即可
  const firstWeek = [...weeks[0]];
  for (const overflowWeek of weeks.slice(COMPACT_CALENDAR_MAX_WEEKS)) {
    overflowWeek.forEach((date, column) => {
      if (date.getMonth() === monthIndex) {
        firstWeek[column] = date;
      }
    });
  }
  return [firstWeek, ...weeks.slice(1, COMPACT_CALENDAR_MAX_WEEKS)];
}
