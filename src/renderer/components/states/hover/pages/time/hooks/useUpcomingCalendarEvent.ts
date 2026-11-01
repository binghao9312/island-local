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
 * @file useUpcomingCalendarEvent.ts
 * @description 获取未来 24 小时内最近的日程事件（合并本地待办、倒数日、节假日及 Google 日历事件）
 * @author 鸡哥
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendarTodos } from '../../../../maxExpand/components/calendar/hooks/useCalendarTodos';
import { useCalendarHolidays } from '../../../../maxExpand/components/calendar/hooks/useCalendarHolidays';
import { useCountdownItems } from '../../../../maxExpand/components/countdown/hooks/useCountdownItems';
import { useGoogleCalendar } from '../../../../expand/pages/CalendarTab/hooks/useGoogleCalendar';
import { findNearestUpcomingEvent, type UpcomingCalendarEvent } from '../utils/upcomingEventUtils';

/**
 * 订阅 Google 日历及本地日历数据，推导未来 24 小时内的最近日程。
 * @returns 最近日程事件对象，无日程时返回 null
 */
export function useUpcomingCalendarEvent(): UpcomingCalendarEvent | null {
  const { t } = useTranslation();
  const untitledLabel = t('expanded.calendar.google.untitled', { defaultValue: '(No title)' });

  const todos = useCalendarTodos();
  const { items: countdowns } = useCountdownItems();

  const now = new Date();
  const holidayInfo = useCalendarHolidays(now.getFullYear());

  const { timeMin, timeMax } = useMemo(() => {
    const cur = new Date();
    cur.setMinutes(0, 0, 0);
    return {
      timeMin: cur.toISOString(),
      timeMax: new Date(cur.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    };
  }, []);

  const google = useGoogleCalendar(timeMin, timeMax);

  return useMemo(() => findNearestUpcomingEvent({
    googleEvents: google.events,
    todos,
    countdowns,
    holidays: holidayInfo.holidays,
    now: new Date(),
    untitledLabel,
  }), [google.events, todos, countdowns, holidayInfo.holidays, untitledLabel]);
}
