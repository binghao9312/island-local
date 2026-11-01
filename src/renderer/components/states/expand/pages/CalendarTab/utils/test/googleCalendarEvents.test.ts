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
 * @file googleCalendarEvents.test.ts
 * @description Google 日历事件映射与同步状态提示的单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  GOOGLE_EVENT_COLOR,
  getGoogleCalendarWindow,
  getGoogleStatusKey,
  toGoogleTimelineEvents,
} from '../googleCalendarEvents';

describe('getGoogleCalendarWindow', () => {
  it('covers the leading and trailing grid days around the month', () => {
    const window = getGoogleCalendarWindow(2026, 10);

    expect(new Date(window.timeMin).getTime()).toBe(new Date(2026, 9, 25).getTime());
    expect(new Date(window.timeMax).getTime()).toBe(new Date(2026, 11, 8).getTime());
  });
});

describe('toGoogleTimelineEvents', () => {
  it('keeps all-day events on their inclusive date keys and tags them as google', () => {
    const [event] = toGoogleTimelineEvents([
      { id: 'a1', title: 'Trip', allDay: true, start: '2026-11-02', end: '2026-11-04' },
    ], '(No title)');

    expect(event).toEqual({
      id: 'gcal:a1',
      kind: 'google',
      label: 'Trip',
      start: '2026-11-02',
      end: '2026-11-04',
      color: GOOGLE_EVENT_COLOR,
    });
  });

  it('prefixes timed events with their local start time and uses local date keys', () => {
    const start = new Date(2026, 10, 2, 9, 5);
    const end = new Date(2026, 10, 2, 9, 45);
    const [event] = toGoogleTimelineEvents([
      { id: 'b2', title: 'Standup', allDay: false, start: start.toISOString(), end: end.toISOString() },
    ], '(No title)');

    expect(event.label).toBe('09:05 Standup');
    expect(event.start).toBe('2026-11-02');
    expect(event.end).toBe('2026-11-02');
  });

  it('uses the untitled label for empty titles', () => {
    const [event] = toGoogleTimelineEvents([
      { id: 'c3', title: '', allDay: true, start: '2026-11-05', end: '2026-11-06' },
    ], '(No title)');

    expect(event.label).toBe('(No title)');
  });

  it('drops events with malformed dates instead of rendering bogus days', () => {
    const events = toGoogleTimelineEvents([
      { id: 'd4', title: 'bad', allDay: true, start: '2026/11/02', end: '2026-11-03' },
      { id: 'e5', title: 'bad time', allDay: false, start: 'not-a-date', end: '2026-11-03T10:00:00Z' },
    ], '(No title)');

    expect(events).toEqual([]);
  });
});

describe('getGoogleStatusKey', () => {
  it('shows nothing while sync is disabled', () => {
    expect(getGoogleStatusKey({ enabled: false, status: { available: false, loggedIn: false }, error: 'gws-missing' })).toBeNull();
  });

  it('shows nothing before the status is known', () => {
    expect(getGoogleStatusKey({ enabled: true, status: null, error: null })).toBeNull();
  });

  it('distinguishes missing gws, logged-out, network and other failures', () => {
    expect(getGoogleStatusKey({ enabled: true, status: { available: false, loggedIn: false }, error: null }))
      .toBe('expanded.calendar.google.missing');
    expect(getGoogleStatusKey({ enabled: true, status: { available: true, loggedIn: false }, error: null }))
      .toBe('expanded.calendar.google.loggedOut');
    expect(getGoogleStatusKey({ enabled: true, status: { available: true, loggedIn: true }, error: 'not-logged-in' }))
      .toBe('expanded.calendar.google.loggedOut');
    expect(getGoogleStatusKey({ enabled: true, status: { available: true, loggedIn: true }, error: 'network' }))
      .toBe('expanded.calendar.google.network');
    expect(getGoogleStatusKey({ enabled: true, status: { available: true, loggedIn: true }, error: 'unknown' }))
      .toBe('expanded.calendar.google.error');
  });

  it('returns null when everything is healthy', () => {
    expect(getGoogleStatusKey({ enabled: true, status: { available: true, loggedIn: true }, error: null })).toBeNull();
  });
});
