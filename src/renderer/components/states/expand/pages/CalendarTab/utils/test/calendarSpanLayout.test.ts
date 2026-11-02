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
 * @file calendarSpanLayout.test.ts
 * @description 跨天事件横条布局的单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { layoutSpanSegments, type SpanEvent } from '../calendarSpanLayout';

/**
 * 生成连续 7 天的一行日期键
 * @param first - 该行第一天在 2026-11 中的日号
 * @returns 7 个日期键
 */
function week(first: number): string[] {
  return Array.from({ length: 7 }, (_, i) => `2026-11-${String(first + i).padStart(2, '0')}`);
}

/**
 * 构造测试事件
 * @param id - 事件 ID
 * @param start - 起始日期键
 * @param end - 包含当日的结束日期键
 * @returns 横条事件
 */
function span(id: string, start: string, end: string): SpanEvent {
  return { id, label: id, color: '#123456', start, end };
}

describe('layoutSpanSegments', () => {
  const weeks = [week(1), week(8), week(15)];

  it('draws a single bar for an event inside one row', () => {
    const { segments } = layoutSpanSegments(weeks, [span('a', '2026-11-02', '2026-11-04')], 2);

    expect(segments).toEqual([{
      id: 'a', label: 'a', color: '#123456', row: 0, column: 1, span: 3, lane: 0, continuesBefore: false, continuesAfter: false,
    }]);
  });

  it('splits an event across rows and marks the continuation edges', () => {
    const { segments } = layoutSpanSegments(weeks, [span('a', '2026-11-06', '2026-11-16')], 2);

    expect(segments.map((s) => [s.row, s.column, s.span, s.continuesBefore, s.continuesAfter])).toEqual([
      [0, 5, 2, false, true],
      [1, 0, 7, true, true],
      [2, 0, 2, true, false],
    ]);
  });

  it('clips events that start before or end after the visible weeks', () => {
    const { segments } = layoutSpanSegments(weeks, [span('a', '2026-10-25', '2026-11-02'), span('b', '2026-11-20', '2026-12-05')], 2);

    expect(segments[0]).toMatchObject({ id: 'a', row: 0, column: 0, span: 2, continuesBefore: true, continuesAfter: false });
    expect(segments[1]).toMatchObject({ id: 'b', row: 2, column: 5, span: 2, continuesBefore: false, continuesAfter: true });
  });

  it('stacks overlapping events in separate lanes and reuses a free lane', () => {
    const { segments } = layoutSpanSegments(weeks, [
      span('a', '2026-11-02', '2026-11-05'),
      span('b', '2026-11-04', '2026-11-06'),
      span('c', '2026-11-06', '2026-11-07'),
    ], 3);

    expect(segments.map((s) => [s.id, s.lane])).toEqual([['a', 0], ['b', 1], ['c', 0]]);
  });

  it('puts earlier-starting and longer events in upper lanes regardless of input order', () => {
    const { segments } = layoutSpanSegments(weeks, [span('short', '2026-11-02', '2026-11-03'), span('long', '2026-11-02', '2026-11-06')], 3);

    expect(segments.find((s) => s.id === 'long')?.lane).toBe(0);
    expect(segments.find((s) => s.id === 'short')?.lane).toBe(1);
  });

  it('caps lanes and reports the dates of dropped bars as overflow', () => {
    const { segments, overflowDates } = layoutSpanSegments(weeks, [
      span('a', '2026-11-02', '2026-11-04'),
      span('b', '2026-11-02', '2026-11-03'),
      span('c', '2026-11-03', '2026-11-04'),
    ], 2);

    expect(segments.map((s) => s.id)).toEqual(['a', 'b']);
    expect([...overflowDates].sort()).toEqual(['2026-11-03', '2026-11-04']);
  });

  it('skips hidden cells and splits runs that are not adjacent after month folding', () => {
    const folded = [['2026-05-31', null, null, null, null, '2026-05-01', '2026-05-02']];
    const { segments } = layoutSpanSegments(folded, [span('a', '2026-05-01', '2026-05-31')], 2);

    expect(segments.map((s) => [s.column, s.span])).toEqual([[0, 1], [5, 2]]);
  });

  it('returns nothing when there are no events or no visible dates overlap', () => {
    expect(layoutSpanSegments(weeks, [], 2)).toEqual({ segments: [], overflowDates: new Set() });
    expect(layoutSpanSegments(weeks, [span('a', '2027-01-01', '2027-01-03')], 2).segments).toEqual([]);
  });
});
