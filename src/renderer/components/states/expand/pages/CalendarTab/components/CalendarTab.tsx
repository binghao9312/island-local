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
 * @file CalendarTab.tsx
 * @description 展开态紧凑日历 Tab 组件
 * @author 鸡哥
 */

import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendar } from '../../../../maxExpand/components/calendar/hooks/useCalendar';
import { useCalendarHolidays } from '../../../../maxExpand/components/calendar/hooks/useCalendarHolidays';
import { useCalendarTodos } from '../../../../maxExpand/components/calendar/hooks/useCalendarTodos';
import { useCountdownItems } from '../../../../maxExpand/components/countdown/hooks/useCountdownItems';
import {
  getCalendarTimelineEvents,
  getCalendarEventsInYears,
} from '../../../../maxExpand/components/calendar/utils/calendarTimelineUtils';
import {
  getCalendarWeeks,
  shiftCalendarMonth,
} from '../../../../maxExpand/components/calendar/utils/calendarUtils';
import { getCalendarDateKey } from '../../../../maxExpand/components/calendar/utils/calendarHolidayUtils';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import {
  getGoogleCalendarWindow,
  getGoogleStatusKey,
  toGoogleTimelineEvents,
} from '../utils/googleCalendarEvents';

/** 7 个星期的简写头，基准从周日开始 */
const WEEKDAY_KEYS = [
  'overview.time.weekdays.0',
  'overview.time.weekdays.1',
  'overview.time.weekdays.2',
  'overview.time.weekdays.3',
  'overview.time.weekdays.4',
  'overview.time.weekdays.5',
  'overview.time.weekdays.6',
] as const;

/**
 * 展开状态紧凑日历组件
 * @description 左侧展示大号日期 Hero（日期数字、星期、月份），中间为带事件点与今日标记的紧凑月历网格，
 * 右侧紧凑列出选中日期的全部事件（节日、待办、倒数日）。
 * @returns 紧凑日历 React 元素
 */
export function CalendarTab(): ReactElement {
  const { t } = useTranslation();
  const {
    today,
    selectedDate,
    selectedDay,
    locale,
    selectDate,
  } = useCalendar();

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const holidayInfo = useCalendarHolidays(year);
  const todos = useCalendarTodos();
  const { items: countdowns } = useCountdownItems();
  const googleWindow = useMemo(() => getGoogleCalendarWindow(year, month), [year, month]);
  const google = useGoogleCalendar(googleWindow.timeMin, googleWindow.timeMax);
  const googleEvents = useMemo(
    () => toGoogleTimelineEvents(google.events, t('expanded.calendar.google.untitled', { defaultValue: '(No title)' })),
    [google.events, t],
  );
  const googleStatusKey = getGoogleStatusKey({ enabled: google.enabled, status: google.status, error: google.error });

  const allEvents = useMemo(
    () => [...getCalendarTimelineEvents(holidayInfo.holidays, todos, countdowns, today), ...googleEvents],
    [holidayInfo.holidays, todos, countdowns, today, googleEvents],
  );

  const yearEvents = useMemo(
    () => getCalendarEventsInYears(allEvents, year),
    [allEvents, year],
  );

  // 预构建有事件的日期集合
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    yearEvents.forEach((event) => {
      if (event.start === event.end) {
        set.add(event.start);
      } else {
        const cur = new Date(event.start);
        const end = new Date(event.end);
        while (cur <= end) {
          set.add(getCalendarDateKey(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    });
    return set;
  }, [yearEvents]);

  const selectedKey = getCalendarDateKey(selectedDate);
  const selectedEvents = useMemo(
    () => yearEvents.filter((event) => event.start <= selectedKey && event.end >= selectedKey),
    [yearEvents, selectedKey],
  );

  const weeks = useMemo(() => getCalendarWeeks(selectedDate), [selectedDate]);

  // 本地化星期与月份文案
  const weekdayName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedDate);
    } catch {
      return t(WEEKDAY_KEYS[selectedDate.getDay()]);
    }
  }, [locale, selectedDate, t]);

  const monthYearLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }).format(selectedDate);
    } catch {
      return `${year} / ${month + 1}`;
    }
  }, [locale, selectedDate, year, month]);

  return (
    <div className="expanded-calendar-compact">
      {/* 左侧大日期 Hero */}
      <div className="compact-calendar-hero">
        <div className="compact-calendar-hero-day">{selectedDay}</div>
        <div className="compact-calendar-hero-meta">
          <span className="compact-calendar-hero-weekday">{weekdayName}</span>
          <span className="compact-calendar-hero-month">{monthYearLabel}</span>
          <div className="compact-calendar-month-nav">
            <button
              type="button"
              className="compact-calendar-nav-btn"
              onClick={() => selectDate(shiftCalendarMonth(selectedDate, -1))}
              aria-label={t('expanded.nav.previousPage', { defaultValue: 'Previous page' })}
            >
              ‹
            </button>
            <button
              type="button"
              className="compact-calendar-nav-btn"
              onClick={() => selectDate(shiftCalendarMonth(selectedDate, 1))}
              aria-label={t('expanded.nav.nextPage', { defaultValue: 'Next page' })}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="compact-calendar-divider" />

      {/* 中间月历网格 */}
      <div className="compact-calendar-grid-wrapper">
        <div className="compact-calendar-weekdays">
          {WEEKDAY_KEYS.map((key) => {
            const label = t(key);
            const headerChar = label.length === 2 ? label.slice(1) : label.slice(0, 1);
            return (
              <span key={key} className="compact-calendar-weekday-header">
                {headerChar}
              </span>
            );
          })}
        </div>
        <div className="compact-calendar-days-grid">
          {weeks.map((week) =>
            week.map((date) => {
              const dateKey = getCalendarDateKey(date);
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();
              const isSelected =
                date.getFullYear() === selectedDate.getFullYear() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getDate() === selectedDate.getDate();
              const isCurrentMonth = date.getMonth() === month;
              const hasEvents = eventDatesSet.has(dateKey);

              const classNames = [
                'compact-calendar-day-cell',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                !isCurrentMonth ? 'is-outside-month' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={classNames}
                  onClick={() => selectDate(date)}
                  aria-label={dateKey}
                  aria-pressed={isSelected}
                >
                  <span>{date.getDate()}</span>
                  {hasEvents && <span className="compact-calendar-event-dot" />}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div className="compact-calendar-divider" />

      {/* 右侧日程列表 */}
      <div className="compact-calendar-events-section">
        <div className="compact-calendar-events-header">
          <div className="compact-calendar-events-title">
            {selectedKey}
          </div>
          {google.enabled && google.status?.loggedIn === true && (
            <button
              type="button"
              className="compact-calendar-nav-btn"
              onClick={google.refresh}
              aria-label={t('expanded.calendar.google.refresh', { defaultValue: 'Refresh Google Calendar' })}
            >
              ↻
            </button>
          )}
        </div>
        {googleStatusKey && (
          <div className="compact-calendar-google-status">
            {t(googleStatusKey, { defaultValue: 'Google Calendar unavailable' })}
          </div>
        )}
        {selectedEvents.length === 0 ? (
          <div className="compact-calendar-no-events">
            {t('expanded.calendar.noEvents', { defaultValue: '暂无日程安排' })}
          </div>
        ) : (
          <div className="compact-calendar-events-list">
            {selectedEvents.map((event) => (
              <div key={event.id} className="compact-calendar-event-item">
                <span
                  className={`compact-calendar-event-type-dot ${event.kind}`}
                  style={event.color ? { backgroundColor: event.color } : undefined}
                />
                <span className="compact-calendar-event-label" title={event.label}>
                  {event.label}
                </span>
                {event.kind === 'google' && (
                  <span
                    className="compact-calendar-google-badge"
                    title={t('expanded.calendar.google.badge', { defaultValue: 'Google Calendar' })}
                  >
                    G
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
