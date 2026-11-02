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
import type { SpanEvent } from './calendarSpanLayout';
import type {
  GoogleCalendarErrorCode,
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleCalendarStatus,
} from '../../../../../../../shared/googleCalendarTypes';

/** 日历未提供颜色时的回退色，使用品牌蓝与本地节假日、待办、倒数日区分 */
export const GOOGLE_EVENT_COLOR = '#4285f4';
/** 时间轴事件 ID 的前缀，用于从时间轴事件还原 Google 事件 ID */
export const GOOGLE_EVENT_ID_PREFIX = 'gcal:';

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
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 生成 Google 事件在时间轴中的唯一 ID
 * @description 事件 ID 仅在单个日历内唯一，因此与 calendarId 组合。两者的字符集都不含冒号，拼接不会产生歧义。
 * @param event - Google 事件
 * @returns 形如 gcal:{calendarId}:{id} 的时间轴事件 ID
 */
export function getGoogleTimelineId(event: GoogleCalendarEvent): string {
  return `${GOOGLE_EVENT_ID_PREFIX}${event.calendarId}:${event.id}`;
}

/**
 * 取得 Google 事件覆盖的本地日期范围
 * @description 全天事件直接使用其日期键；定时事件按本地时区取日期，恰好在本地 0 点结束的事件不计入结束当天。
 * @param event - 已规范化的 Google 事件
 * @returns 起止日期键（含）；日期或时间无法解析时返回 null
 */
function getEventDateRange(event: GoogleCalendarEvent): { start: string; end: string } | null {
  if (event.allDay) {
    if (!DATE_KEY_PATTERN.test(event.start) || !DATE_KEY_PATTERN.test(event.end)) return null;
    return { start: event.start, end: event.end < event.start ? event.start : event.end };
  }
  const startTime = Date.parse(event.start);
  const endTime = Date.parse(event.end);
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return null;
  const endDate = new Date(Math.max(startTime, endTime));
  const endsAtMidnight = endTime > startTime && endDate.getHours() === 0 && endDate.getMinutes() === 0;
  return {
    start: getCalendarDateKey(new Date(startTime)),
    end: getCalendarDateKey(endsAtMidnight ? new Date(endTime - 1) : endDate),
  };
}

/**
 * 将 Google 事件转换为时间轴事件（本地日期）
 * @description 定时事件在标题前附加开始时间。
 * 无法解析的时间或日期会被丢弃，避免一条坏数据影响整个月历。
 * @param events - 已规范化的 Google 事件
 * @param untitledLabel - 无标题事件的占位文案
 * @returns 可与本地事件合并的时间轴事件
 */
export function toGoogleTimelineEvents(events: GoogleCalendarEvent[], untitledLabel: string): CalendarTimelineEvent[] {
  return events.flatMap((event): CalendarTimelineEvent[] => {
    const range = getEventDateRange(event);
    if (!range) return [];
    const title = event.title || untitledLabel;
    const label = event.allDay ? title : `${formatClock(new Date(event.start))} ${title}`;
    return [{ id: getGoogleTimelineId(event), kind: 'google', label, start: range.start, end: range.end, color: event.color || GOOGLE_EVENT_COLOR }];
  });
}

/**
 * 取出需要画成横条的跨天 Google 事件
 * @description 单日事件保持圆点样式，不在此返回；颜色取日历色。
 * @param events - 已规范化的 Google 事件
 * @param untitledLabel - 无标题事件的占位文案
 * @returns 跨天事件的横条输入
 */
export function toGoogleSpanEvents(events: GoogleCalendarEvent[], untitledLabel: string): SpanEvent[] {
  return events.flatMap((event): SpanEvent[] => {
    const range = getEventDateRange(event);
    if (!range || range.start === range.end) return [];
    return [{ id: getGoogleTimelineId(event), label: event.title || untitledLabel, color: event.color || GOOGLE_EVENT_COLOR, ...range }];
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

/** 紧凑表单的字段值：日期为 YYYY-MM-DD，时间为本地 HH:mm */
export interface GoogleEventFormValues {
  title: string;
  allDay: boolean;
  date: string;
  startTime: string;
  endTime: string;
}

/** 日历中当前打开的 Google 表单：新建，或编辑指定 ID 的事件 */
export type GoogleEditorState = { kind: 'create' } | { kind: 'edit'; calendarId: string; id: string };

/**
 * 生成表单初始值
 * @description 新建时默认 09:00-10:00 的定时事件；编辑时从已有事件还原本地日期与时间。
 * @param event - 正在编辑的事件，新建时为 null
 * @param defaultDate - 新建事件的默认日期 YYYY-MM-DD，即日历当前选中日
 * @returns 表单初始值
 */
export function createEventFormValues(event: GoogleCalendarEvent | null, defaultDate: string): GoogleEventFormValues {
  if (!event) return { title: '', allDay: false, date: defaultDate, startTime: '09:00', endTime: '10:00' };
  if (event.allDay) return { title: event.title, allDay: true, date: event.start, startTime: '09:00', endTime: '10:00' };
  const start = new Date(event.start);
  return {
    title: event.title,
    allDay: false,
    date: getCalendarDateKey(start),
    startTime: formatClock(start),
    endTime: formatClock(new Date(event.end)),
  };
}

/**
 * 校验表单字段
 * @description 只做界面即时反馈，权威校验仍在主进程完成。定时事件的结束时间必须晚于开始时间。
 * @param values - 表单字段值
 * @returns 无问题时返回 null，否则返回 'invalid'
 */
export function validateEventFormValues(values: GoogleEventFormValues): 'invalid' | null {
  if (!values.title.trim() || !values.date) return 'invalid';
  if (!values.allDay && values.endTime <= values.startTime) return 'invalid';
  return null;
}

/**
 * 将表单字段转换为提交给主进程的输入
 * @param values - 已通过 validateEventFormValues 校验的字段值
 * @returns 事件输入；全天事件不携带时间字段
 */
export function toEventInput(values: GoogleEventFormValues): GoogleCalendarEventInput {
  const title = values.title.trim();
  if (values.allDay) return { title, allDay: true, date: values.date };
  return { title, allDay: false, date: values.date, startTime: values.startTime, endTime: values.endTime };
}
