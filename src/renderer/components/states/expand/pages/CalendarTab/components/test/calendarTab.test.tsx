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
import { GoogleEventForm } from '../GoogleEventForm';

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

const mockGoogle = vi.hoisted(() => ({
  enabled: false,
  status: null as { available: boolean; loggedIn: boolean } | null,
  events: [] as Array<{ id: string; title: string; allDay: boolean; start: string; end: string }>,
  error: null as string | null,
  refresh: vi.fn(),
}));

vi.mock('../../hooks/useGoogleCalendar', () => ({
  useGoogleCalendar: () => mockGoogle,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCalendar.selectedDate = new Date(2026, 10, 1);
  mockCalendar.selectedDay = 1;
  mockGoogle.enabled = false;
  mockGoogle.status = null;
  mockGoogle.events = [];
  mockGoogle.error = null;
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

  it('merges Google events with a badge and shows the refresh control when signed in', () => {
    mockGoogle.enabled = true;
    mockGoogle.status = { available: true, loggedIn: true };
    mockGoogle.events = [
      { id: 'g1', title: 'Design review', allDay: false, start: new Date(2026, 10, 1, 10, 0).toISOString(), end: new Date(2026, 10, 1, 11, 0).toISOString() },
    ];

    const tree = render(CalendarTab);

    expect(text(tree)).toContain('10:00 Design review');
    expect(nodes(tree, '.compact-calendar-google-badge')).toHaveLength(1);
    expect(nodes(tree, '.compact-calendar-google-status')).toHaveLength(0);
    // 两个月份切换按钮，加上新增与刷新按钮。
    expect(nodes(tree, '.compact-calendar-nav-btn')).toHaveLength(4);
  });

  it('shows a status line and no Google UI when gws is missing', () => {
    mockGoogle.enabled = true;
    mockGoogle.status = { available: false, loggedIn: false };

    const tree = render(CalendarTab);

    expect(nodes(tree, '.compact-calendar-google-status')).toHaveLength(1);
    expect(nodes(tree, '.compact-calendar-google-badge')).toHaveLength(0);
    expect(nodes(tree, '.compact-calendar-nav-btn')).toHaveLength(2);
  });

  it('opens the editor from a single-day Google event row', () => {
    mockGoogle.enabled = true;
    mockGoogle.status = { available: true, loggedIn: true };
    mockGoogle.events = [
      { id: 'g3', title: 'Lunch', allDay: true, start: '2026-11-01', end: '2026-11-01' },
    ];

    const tree = render(CalendarTab);
    expect(nodes(tree, '.compact-calendar-event-button')).toHaveLength(1);
    trigger(tree, '.compact-calendar-event-button', 'onClick');

    expect(nodes(render(CalendarTab), GoogleEventForm)).toHaveLength(1);
  });

  it('keeps multi-day Google events read-only', () => {
    mockGoogle.enabled = true;
    mockGoogle.status = { available: true, loggedIn: true };
    mockGoogle.events = [
      { id: 'g4', title: 'Trip', allDay: true, start: '2026-11-01', end: '2026-11-03' },
    ];

    expect(nodes(render(CalendarTab), '.compact-calendar-event-button')).toHaveLength(0);
  });

  it('hides Google UI entirely while sync is disabled', () => {
    mockGoogle.enabled = false;

    const tree = render(CalendarTab);

    expect(nodes(tree, '.compact-calendar-google-status')).toHaveLength(0);
    expect(nodes(tree, '.compact-calendar-google-badge')).toHaveLength(0);
  });
});
