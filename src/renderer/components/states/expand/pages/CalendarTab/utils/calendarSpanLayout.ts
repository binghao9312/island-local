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
 * @file calendarSpanLayout.ts
 * @description 展开日历月视图中跨天事件的横条布局：按周行切段并分配泳道
 * @author 鸡哥
 */

/** 需要画成横条的跨天事件，start/end 均为包含当日的 YYYY-MM-DD */
export interface SpanEvent {
  id: string;
  label: string;
  color: string;
  start: string;
  end: string;
}

/** 横条在某一周行中的一个可见片段 */
export interface SpanSegment {
  id: string;
  label: string;
  color: string;
  /** 周行下标，从 0 开始 */
  row: number;
  /** 起始列下标，从 0 开始 */
  column: number;
  /** 占用的列数 */
  span: number;
  /** 泳道下标，0 为最上层 */
  lane: number;
  /** 事件在该片段之前还有日期（从上一行延续而来） */
  continuesBefore: boolean;
  /** 事件在该片段之后还有日期（延续到下一行） */
  continuesAfter: boolean;
}

/** 布局结果 */
export interface SpanLayout {
  /** 需要绘制的片段 */
  segments: SpanSegment[];
  /** 因泳道不足而未绘制的片段覆盖的日期，调用方应改用圆点提示 */
  overflowDates: Set<string>;
}

/**
 * 计算跨天事件在月视图周行中的横条片段
 * @description 每行内，事件在可见日期上连续的部分各成一段（月视图折叠后同一行的可见日期可能不连续）。
 * 排序为起始日靠前优先、持续更长优先，再按 ID，保证延续而来的事件稳定占据上层泳道；
 * 泳道逐行贪心分配，超过 maxLanes 的片段不返回，其日期记入 overflowDates。
 * @param weeks - 每行每列的日期键 YYYY-MM-DD，不显示的格子为 null
 * @param events - 跨天事件，end 为包含当日（Google 全天事件的开区间结束日需先减一天）
 * @param maxLanes - 每行最多的泳道数
 * @returns 片段与溢出日期
 */
export function layoutSpanSegments(weeks: Array<Array<string | null>>, events: SpanEvent[], maxLanes: number): SpanLayout {
  const sorted = [...events].sort((a, b) =>
    a.start.localeCompare(b.start) || b.end.localeCompare(a.end) || a.id.localeCompare(b.id));
  const segments: SpanSegment[] = [];
  const overflowDates = new Set<string>();

  weeks.forEach((keys, row) => {
    // 每条泳道已占用的列集合
    const lanes: Array<Set<number>> = [];
    for (const event of sorted) {
      let column = 0;
      while (column < keys.length) {
        const first = keys[column];
        if (first === null || first < event.start || first > event.end) {
          column += 1;
          continue;
        }
        let last = column;
        while (last + 1 < keys.length) {
          const next = keys[last + 1];
          if (next === null || next > event.end) break;
          last += 1;
        }
        const columns = Array.from({ length: last - column + 1 }, (_, offset) => column + offset);
        let lane = lanes.findIndex((used) => columns.every((c) => !used.has(c)));
        if (lane < 0) {
          lane = lanes.length;
          lanes.push(new Set());
        }
        columns.forEach((c) => lanes[lane].add(c));
        if (lane < maxLanes) {
          segments.push({
            id: event.id,
            label: event.label,
            color: event.color,
            row,
            column,
            span: columns.length,
            lane,
            continuesBefore: event.start < (first as string),
            continuesAfter: event.end > (keys[last] as string),
          });
        } else {
          columns.forEach((c) => overflowDates.add(keys[c] as string));
        }
        column = last + 1;
      }
    }
  });

  return { segments, overflowDates };
}
