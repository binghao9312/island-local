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
 * @file useUpcomingCalendarEvent.test.ts
 * @description useUpcomingCalendarEvent hook 单元测试
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { useUpcomingCalendarEvent } from '../useUpcomingCalendarEvent';
import type { GoogleCalendarEvent } from '../../../../../../../../shared/googleCalendarTypes';
import type { TodoItem } from '../../../../../maxExpand/components/todo/types/todoTypes';

const mockState = {
  googleEvents: [] as GoogleCalendarEvent[],
  todos: [] as TodoItem[],
};

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useMemo: (factory: () => unknown) => factory(),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../expand/pages/CalendarTab/hooks/useGoogleCalendar', () => ({
  useGoogleCalendar: () => ({ events: mockState.googleEvents }),
}));

vi.mock('../../../../../maxExpand/components/calendar/hooks/useCalendarTodos', () => ({
  useCalendarTodos: () => mockState.todos,
}));

vi.mock('../../../../../maxExpand/components/calendar/hooks/useCalendarHolidays', () => ({
  useCalendarHolidays: () => ({ holidays: new Map() }),
}));

vi.mock('../../../../../maxExpand/components/countdown/hooks/useCountdownItems', () => ({
  useCountdownItems: () => ({ items: [] }),
}));

describe('useUpcomingCalendarEvent', () => {
  it('无日程时返回 null', () => {
    mockState.googleEvents = [];
    mockState.todos = [];
    expect(useUpcomingCalendarEvent()).toBeNull();
  });

  it('存在即将开始的 Google 日程时返回最近日程', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const timeStr = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`;
    mockState.googleEvents = [
      {
        id: 'ev-1',
        title: 'Sprint Planning',
        start: futureDate.toISOString(),
        end: new Date(futureDate.getTime() + 3600000).toISOString(),
        allDay: false,
      },
    ];

    const result = useUpcomingCalendarEvent();
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Sprint Planning');
    expect(result?.timeStr).toBe(timeStr);
  });
});
