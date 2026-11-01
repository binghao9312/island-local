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
 * @file upcomingEventUtils.ts
 * @description 悬浮时间面板最近日程过滤与格式化工具函数
 * @author 鸡哥
 */

import type { GoogleCalendarEvent } from '../../../../../../../shared/googleCalendarTypes';
import type { CalendarHolidayIndex } from '../../../../maxExpand/components/calendar/types/calendarHolidayTypes';
import type { CountdownItem } from '../../../../maxExpand/components/countdown/types/countdownTypes';
import type { TodoItem } from '../../../../maxExpand/components/todo/types/todoTypes';

/** 最近日程展示数据 */
export interface UpcomingCalendarEvent {
  startMs: number;
  timeStr: string;
  title: string;
}

/** 查找最近日程的参数 */
export interface FindNearestUpcomingEventParams {
  googleEvents?: GoogleCalendarEvent[];
  todos?: TodoItem[];
  countdowns?: CountdownItem[];
  holidays?: CalendarHolidayIndex;
  now?: Date;
  untitledLabel?: string;
}

/**
 * 从 Google 日历事件、待办、倒数日与节假日中找出未来 24 小时内最近的一条日程。
 * @param params - 各种日程源与基准时间参数
 * @returns 最近的日程事件；若未来 24 小时内无日程则返回 null
 */
export function findNearestUpcomingEvent(params: FindNearestUpcomingEventParams): UpcomingCalendarEvent | null {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const endMs = nowMs + 24 * 60 * 60 * 1000;
  const untitled = params.untitledLabel ?? '(No title)';
  const candidates: UpcomingCalendarEvent[] = [];

  (params.googleEvents ?? []).forEach((event) => {
    const title = event.title?.trim() || untitled;
    if (event.allDay) {
      const parts = event.start.split('-').map(Number);
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        const startMs = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
        if (startMs >= nowMs && startMs <= endMs) {
          candidates.push({ startMs, timeStr: '00:00', title });
        }
      }
    } else {
      const startMs = Date.parse(event.start);
      if (!Number.isNaN(startMs) && startMs >= nowMs && startMs <= endMs) {
        const date = new Date(startMs);
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        candidates.push({ startMs, timeStr, title });
      }
    }
  });

  (params.todos ?? []).forEach((todo) => {
    if (todo.done || !todo.dueDate) return;
    const parts = todo.dueDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return;
    const startMs = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
    if (startMs >= nowMs && startMs <= endMs) {
      candidates.push({ startMs, timeStr: '00:00', title: todo.text.trim() });
    }
  });

  (params.countdowns ?? []).forEach((item) => {
    if (item.archived || !item.date) return;
    const parts = item.date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return;
    let startMs: number;
    if (item.repeat === 'yearly' && item.mode !== 'up') {
      const currentYear = now.getFullYear();
      let target = new Date(currentYear, parts[1] - 1, parts[2], 0, 0, 0, 0);
      if (target.getTime() < nowMs) {
        target = new Date(currentYear + 1, parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
      startMs = target.getTime();
    } else {
      startMs = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
    }
    if (startMs >= nowMs && startMs <= endMs) {
      candidates.push({ startMs, timeStr: '00:00', title: item.name.trim() });
    }
  });

  if (params.holidays) {
    params.holidays.forEach((names, dateKey) => {
      const parts = dateKey.split('-').map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return;
      const startMs = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
      if (startMs >= nowMs && startMs <= endMs) {
        candidates.push({ startMs, timeStr: '00:00', title: names.join(', ').trim() });
      }
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.startMs - b.startMs || a.title.localeCompare(b.title));
  return candidates[0];
}
