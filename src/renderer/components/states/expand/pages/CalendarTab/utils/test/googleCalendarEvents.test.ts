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
  createEventFormValues,
  GOOGLE_EVENT_COLOR,
  getGoogleCalendarWindow,
  getGoogleStatusKey,
  getGoogleTimelineId,
  toEventInput,
  toGoogleSpanEvents,
  toGoogleTimelineEvents,
  validateEventFormValues,
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
      { id: 'a1', calendarId: 'primary', color: '#4285f4', readOnly: false, title: 'Trip', allDay: true, start: '2026-11-02', end: '2026-11-04' },
    ], '(No title)');

    expect(event).toEqual({
      id: 'gcal:primary:a1',
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
      { id: 'b2', calendarId: 'primary', color: '#4285f4', readOnly: false, title: 'Standup', allDay: false, start: start.toISOString(), end: end.toISOString() },
    ], '(No title)');

    expect(event.label).toBe('09:05 Standup');
    expect(event.start).toBe('2026-11-02');
    expect(event.end).toBe('2026-11-02');
  });

  it('uses the untitled label for empty titles', () => {
    const [event] = toGoogleTimelineEvents([
      { id: 'c3', calendarId: 'primary', color: '#4285f4', readOnly: false, title: '', allDay: true, start: '2026-11-05', end: '2026-11-06' },
    ], '(No title)');

    expect(event.label).toBe('(No title)');
  });

  it('drops events with malformed dates instead of rendering bogus days', () => {
    const events = toGoogleTimelineEvents([
      { id: 'd4', calendarId: 'primary', color: '#4285f4', readOnly: false, title: 'bad', allDay: true, start: '2026/11/02', end: '2026-11-03' },
      { id: 'e5', calendarId: 'primary', color: '#4285f4', readOnly: false, title: 'bad time', allDay: false, start: 'not-a-date', end: '2026-11-03T10:00:00Z' },
    ], '(No title)');

    expect(events).toEqual([]);
  });
});

describe('calendar identity and color', () => {
  it('keys timeline events by calendarId and id so equal event ids do not collide', () => {
    const events = toGoogleTimelineEvents([
      { id: 'same', calendarId: 'a@example.com', color: '#ff0000', readOnly: false, title: 'A', allDay: true, start: '2026-11-02', end: '2026-11-02' },
      { id: 'same', calendarId: 'b@example.com', color: '#00ff00', readOnly: true, title: 'B', allDay: true, start: '2026-11-02', end: '2026-11-02' },
    ], '(No title)');

    expect(events.map((event) => event.id)).toEqual(['gcal:a@example.com:same', 'gcal:b@example.com:same']);
    expect(events.map((event) => event.color)).toEqual(['#ff0000', '#00ff00']);
  });

  it('builds the timeline id from the event itself', () => {
    expect(getGoogleTimelineId({
      id: 'e1', calendarId: 'c@group.calendar.google.com', color: '#000000', readOnly: false, title: '', allDay: true, start: '2026-11-02', end: '2026-11-02',
    })).toBe('gcal:c@group.calendar.google.com:e1');
  });
});

describe('toGoogleSpanEvents', () => {
  const base = { calendarId: 'a@example.com', color: '#336699', readOnly: false };

  it('returns multi-day all-day events with the calendar color and skips single-day ones', () => {
    const spans = toGoogleSpanEvents([
      { ...base, id: 'trip', title: 'Trip', allDay: true, start: '2026-10-25', end: '2026-11-01' },
      { ...base, id: 'one', title: 'One', allDay: true, start: '2026-11-02', end: '2026-11-02' },
    ], '(No title)');

    expect(spans).toEqual([{ id: 'gcal:a@example.com:trip', label: 'Trip', color: '#336699', start: '2026-10-25', end: '2026-11-01' }]);
  });

  it('spans timed events that cross local midnight, without a clock prefix in the label', () => {
    const [span] = toGoogleSpanEvents([
      { ...base, id: 'night', title: '', allDay: false, start: new Date(2026, 10, 2, 22, 0).toISOString(), end: new Date(2026, 10, 3, 6, 0).toISOString() },
    ], '(No title)');

    expect(span).toMatchObject({ label: '(No title)', start: '2026-11-02', end: '2026-11-03' });
  });

  it('does not extend a timed event ending exactly at local midnight into the next day', () => {
    const spans = toGoogleSpanEvents([
      { ...base, id: 'evening', title: 'Evening', allDay: false, start: new Date(2026, 10, 2, 18, 0).toISOString(), end: new Date(2026, 10, 3, 0, 0).toISOString() },
    ], '(No title)');

    expect(spans).toEqual([]);
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

describe('event form values', () => {
  it('starts new timed events on the selected day at 09:00-10:00', () => {
    expect(createEventFormValues(null, '2026-11-02')).toEqual({
      title: '',
      allDay: false,
      date: '2026-11-02',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('restores local date and time when editing a timed event', () => {
    const values = createEventFormValues({
      id: 'e1',
      calendarId: 'primary',
      color: '#4285f4',
      readOnly: false,
      title: 'Review',
      allDay: false,
      start: new Date(2026, 10, 2, 14, 30).toISOString(),
      end: new Date(2026, 10, 2, 15, 15).toISOString(),
    }, '2026-11-09');

    expect(values).toEqual({ title: 'Review', allDay: false, date: '2026-11-02', startTime: '14:30', endTime: '15:15' });
  });

  it('validates blank titles, missing dates and inverted times', () => {
    const base = { title: 'x', allDay: false, date: '2026-11-02', startTime: '10:00', endTime: '11:00' };

    expect(validateEventFormValues(base)).toBeNull();
    expect(validateEventFormValues({ ...base, title: '  ' })).toBe('invalid');
    expect(validateEventFormValues({ ...base, date: '' })).toBe('invalid');
    expect(validateEventFormValues({ ...base, endTime: '09:00' })).toBe('invalid');
    expect(validateEventFormValues({ ...base, allDay: true, endTime: '09:00' })).toBeNull();
  });

  it('trims the title and omits time fields for all-day events', () => {
    expect(toEventInput({ title: ' Trip ', allDay: true, date: '2026-11-02', startTime: '10:00', endTime: '11:00' }))
      .toEqual({ title: 'Trip', allDay: true, date: '2026-11-02' });
    expect(toEventInput({ title: 'Call', allDay: false, date: '2026-11-02', startTime: '10:00', endTime: '10:30' }))
      .toEqual({ title: 'Call', allDay: false, date: '2026-11-02', startTime: '10:00', endTime: '10:30' });
  });
});
