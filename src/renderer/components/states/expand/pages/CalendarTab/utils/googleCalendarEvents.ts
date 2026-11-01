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
 * @file googleCalendarEvents.ts
 * @description Google 日历事件与展开日历时间轴之间的转换工具
 * @author 鸡哥
 */

import type { CalendarTimelineEvent } from '../../../../maxExpand/components/calendar/types/calendarTimelineTypes';
import { getCalendarDateKey } from '../../../../maxExpand/components/calendar/utils/calendarHolidayUtils';
import type {
  GoogleCalendarErrorCode,
  GoogleCalendarEvent,
  GoogleCalendarStatus,
} from '../../../../../../../shared/googleCalendarTypes';

/** Google 事件使用品牌蓝，与本地节假日、待办、倒数日的颜色区分 */
export const GOOGLE_EVENT_COLOR = '#4285f4';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 日历网格在当月前后最多露出的天数，查询窗口需覆盖这些日期 */
const GRID_OVERSCAN_DAYS = 7;

/**
 * 计算日历网格可见范围对应的查询窗口
 * @description 覆盖当月首日前一周到末日后一周，与月视图网格露出的日期一致。
 * @param year - 年份
 * @param month - 月份（0-indexed）
 * @returns 按本地时区划分的 ISO 8601 timeMin 与 timeMax
 */
export function getGoogleCalendarWindow(year: number, month: number): { timeMin: string; timeMax: string } {
  const start = new Date(year, month, 1 - GRID_OVERSCAN_DAYS);
  const end = new Date(year, month + 1, 1 + GRID_OVERSCAN_DAYS);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

/**
 * 格式化本地 24 小时制时间
 * @param date - 本地时间
 * @returns HH:mm 字符串
 */
function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 将 Google 事件转换为时间轴事件（本地日期）
 * @description 全天事件直接使用其日期键；定时事件按本地时区取日期，并在标题前附加开始时间。
 * 无法解析的时间或日期会被丢弃，避免一条坏数据影响整个月历。
 * @param events - 已规范化的 Google 事件
 * @param untitledLabel - 无标题事件的占位文案
 * @returns 可与本地事件合并的时间轴事件
 */
export function toGoogleTimelineEvents(events: GoogleCalendarEvent[], untitledLabel: string): CalendarTimelineEvent[] {
  return events.flatMap((event): CalendarTimelineEvent[] => {
    const title = event.title || untitledLabel;
    if (event.allDay) {
      if (!DATE_KEY_PATTERN.test(event.start) || !DATE_KEY_PATTERN.test(event.end)) return [];
      const end = event.end < event.start ? event.start : event.end;
      return [{ id: `gcal:${event.id}`, kind: 'google', label: title, start: event.start, end, color: GOOGLE_EVENT_COLOR }];
    }
    const startTime = Date.parse(event.start);
    const endTime = Date.parse(event.end);
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) return [];
    const start = new Date(startTime);
    const end = new Date(Math.max(startTime, endTime));
    return [{
      id: `gcal:${event.id}`,
      kind: 'google',
      label: `${formatClock(start)} ${title}`,
      start: getCalendarDateKey(start),
      end: getCalendarDateKey(end),
      color: GOOGLE_EVENT_COLOR,
    }];
  });
}

/** 同步状态提示所需的最小输入，与 useGoogleCalendar 返回值对应 */
export interface GoogleStatusInput {
  /** 是否启用同步 */
  enabled: boolean;
  /** gws 状态，尚未检测时为 null */
  status: GoogleCalendarStatus | null;
  /** 最近一次失败的类别 */
  error: GoogleCalendarErrorCode | null;
}

/**
 * 根据同步状态选择需要展示的提示文案键
 * @description 同步关闭或状态尚未确定时不展示提示；缺失 gws、未登录、网络失败与其他错误分别对应不同文案。
 * @param input - 同步开关、gws 状态与错误类别
 * @returns 对应的 i18n 键，无需提示时返回 null
 */
export function getGoogleStatusKey(input: GoogleStatusInput): string | null {
  if (!input.enabled) return null;
  if (input.status?.available === false || input.error === 'gws-missing') return 'expanded.calendar.google.missing';
  if (input.status?.loggedIn === false || input.error === 'not-logged-in') return 'expanded.calendar.google.loggedOut';
  if (input.error === 'network') return 'expanded.calendar.google.network';
  if (input.error) return 'expanded.calendar.google.error';
  return null;
}
