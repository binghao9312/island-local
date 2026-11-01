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
 * @file googleCalendarTypes.ts
 * @description Google 日历（经已登录的 gws CLI 访问）在主进程、preload 与渲染进程间共享的类型
 * @author 鸡哥
 */

/** 主进程返回的错误类别，渲染进程据此展示对应状态提示 */
export type GoogleCalendarErrorCode = 'gws-missing' | 'not-logged-in' | 'network' | 'invalid-input' | 'unknown';

/** gws 可用性与 Google 登录状态 */
export interface GoogleCalendarStatus {
  /** 是否找到 gws 可执行文件 */
  available: boolean;
  /** 是否存在有效的 Google 授权令牌 */
  loggedIn: boolean;
}

/**
 * 已规范化的 Google 日历事件
 * @description 全天事件的 end 为包含当日的 YYYY-MM-DD（已把 Google 的开区间结束日减一天）；定时事件为 ISO 时间
 */
export interface GoogleCalendarEvent {
  id: string;
  title: string;
  allDay: boolean;
  /** 全天事件为 YYYY-MM-DD，定时事件为 ISO 时间 */
  start: string;
  /** 全天事件为包含当日的 YYYY-MM-DD，定时事件为 ISO 时间 */
  end: string;
}

/**
 * 新建或编辑 Google 日历事件的输入
 * @description 表单总是提供完整字段，编辑即整体覆盖事件的标题与时间
 */
export interface GoogleCalendarEventInput {
  /** 事件标题，去除首尾空白后不能为空 */
  title: string;
  allDay: boolean;
  /** 本地日历日 YYYY-MM-DD */
  date: string;
  /** 定时事件的开始时间 HH:mm，全天事件忽略 */
  startTime?: string;
  /** 定时事件的结束时间 HH:mm，必须晚于开始时间 */
  endTime?: string;
}

/** 日历查询的时间窗口（ISO 8601，timeMin 需早于 timeMax） */
export interface GoogleCalendarRange {
  timeMin: string;
  timeMax: string;
}

/** IPC 统一返回结构；失败时只携带错误类别与不含用户数据的固定文案 */
export type GoogleCalendarResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: GoogleCalendarErrorCode; message: string };
