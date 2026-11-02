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
 * @file upcomingEventUtils.test.ts
 * @description upcomingEventUtils 单元测试：未来 24 小时最近日程筛选与格式化
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { findNearestUpcomingEvent } from '../upcomingEventUtils';
import type { GoogleCalendarEvent } from '../../../../../../../../shared/googleCalendarTypes';
import type { TodoItem } from '../../../../../maxExpand/components/todo/types/todoTypes';
import type { CountdownItem } from '../../../../../maxExpand/components/countdown/types/countdownTypes';

describe('findNearestUpcomingEvent', () => {
  const baseNow = new Date('2026-11-01T10:00:00');

  it('未来 24 小时内无日程时返回 null', () => {
    expect(findNearestUpcomingEvent({ now: baseNow })).toBeNull();
  });

  it('优先挑选未来 24 小时内最临近的 Google 日程', () => {
    const googleEvents: GoogleCalendarEvent[] = [
      {
        id: '1',
        calendarId: 'primary',
        color: '#4285f4',
        readOnly: false,
        title: 'Late Meeting',
        start: '2026-11-01T16:00:00',
        end: '2026-11-01T17:00:00',
        allDay: false,
      },
      {
        id: '2',
        calendarId: 'primary',
        color: '#4285f4',
        readOnly: false,
        title: 'Nearest Meeting',
        start: '2026-11-01T11:30:00',
        end: '2026-11-01T12:00:00',
        allDay: false,
      },
      {
        id: '3',
        calendarId: 'primary',
        color: '#4285f4',
        readOnly: false,
        title: 'Past Meeting',
        start: '2026-11-01T08:00:00',
        end: '2026-11-01T09:00:00',
        allDay: false,
      },
      {
        id: '4',
        calendarId: 'primary',
        color: '#4285f4',
        readOnly: false,
        title: 'Over 24h Meeting',
        start: '2026-11-02T15:00:00',
        end: '2026-11-02T16:00:00',
        allDay: false,
      },
    ];

    const result = findNearestUpcomingEvent({ googleEvents, now: baseNow });
    expect(result).toEqual({
      startMs: new Date('2026-11-01T11:30:00').getTime(),
      timeStr: '11:30',
      title: 'Nearest Meeting',
    });
  });

  it('支持全天日程并使用 00:00 标识', () => {
    const googleEvents: GoogleCalendarEvent[] = [
      {
        id: 'all-day-1',
        calendarId: 'primary',
        color: '#4285f4',
        readOnly: false,
        title: 'All Day Event Tomorrow',
        start: '2026-11-02',
        end: '2026-11-02',
        allDay: true,
      },
    ];

    const result = findNearestUpcomingEvent({ googleEvents, now: baseNow });
    expect(result).toEqual({
      startMs: new Date(2026, 10, 2, 0, 0, 0, 0).getTime(),
      timeStr: '00:00',
      title: 'All Day Event Tomorrow',
    });
  });

  it('支持合并待办与倒数日并忽略已完成或已归档项', () => {
    const todos: TodoItem[] = [
      {
        id: 1,
        text: 'Completed Task',
        done: true,
        createdAt: 0,
        dueDate: '2026-11-02',
      },
      {
        id: 2,
        text: 'Pending Task Tomorrow',
        done: false,
        createdAt: 0,
        dueDate: '2026-11-02',
      },
    ];
    const countdowns: CountdownItem[] = [
      {
        id: 1,
        name: 'Archived Exam',
        date: '2026-11-02',
        color: '#ff0000',
        type: 'exam',
        archived: true,
      },
      {
        id: 2,
        name: 'Release Day',
        date: '2026-11-02',
        color: '#00ff00',
        type: 'countdown',
      },
    ];

    const result = findNearestUpcomingEvent({ todos, countdowns, now: baseNow });
    expect(result).not.toBeNull();
    expect(result?.timeStr).toBe('00:00');
    expect(['Pending Task Tomorrow', 'Release Day']).toContain(result?.title);
  });
});
