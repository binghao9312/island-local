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
 * @file calendarTab.test.tsx
 * @description Expanded CalendarTab 紧凑日历单元测试
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  vi.stubGlobal('window', {
    api: { onSettingsChanged: vi.fn(), storeRead: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

import { render, nodes, text, trigger } from '../../../../../maxExpand/test/componentHarness';
import { CalendarTab } from '../CalendarTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'zh-CN', resolvedLanguage: 'zh-CN' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const mockCalendar = vi.hoisted(() => ({
  today: new Date(2026, 10, 1),
  selectedDate: new Date(2026, 10, 1),
  selectedDay: 1,
  locale: 'zh-CN',
  year: 2026,
  month: 10,
  selectDate: vi.fn(),
  handleDateKeyDown: vi.fn(),
}));

vi.mock('../../../../../maxExpand/components/calendar/hooks/useCalendar', () => ({
  useCalendar: () => mockCalendar,
}));

vi.mock('../../../../../maxExpand/components/calendar/hooks/useCalendarHolidays', () => ({
  useCalendarHolidays: () => ({ holidays: new Map() }),
}));

vi.mock('../../../../../maxExpand/components/calendar/hooks/useCalendarTodos', () => ({
  useCalendarTodos: () => [
    { id: 1, text: '测试待办', done: false, dueDate: '2026-11-01' },
  ],
}));

vi.mock('../../../../../maxExpand/components/countdown/hooks/useCountdownItems', () => ({
  useCountdownItems: () => ({ items: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCalendar.selectedDate = new Date(2026, 10, 1);
  mockCalendar.selectedDay = 1;
});

describe('CalendarTab in expanded view', () => {
  it('renders big date hero, month grid, and selected day events', () => {
    const tree = render(CalendarTab);
    expect(text(tree)).toContain('1');
    expect(text(tree)).toContain('测试待办');

    const dayButtons = nodes(tree, '.compact-calendar-day-cell');
    expect(dayButtons.length).toBeGreaterThanOrEqual(28);

    // Click another day
    trigger(tree, '.compact-calendar-day-cell', 'onClick');
    expect(mockCalendar.selectDate).toHaveBeenCalled();
  });

  it('navigates previous and next month via arrow buttons', () => {
    const tree = render(CalendarTab);
    const navButtons = nodes(tree, '.compact-calendar-nav-btn');
    expect(navButtons).toHaveLength(2);

    trigger(tree, '.compact-calendar-nav-btn', 'onClick');
    expect(mockCalendar.selectDate).toHaveBeenCalled();
  });
});
