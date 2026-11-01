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
 * @file useGoogleCalendar.ts
 * @description 展开日历的 Google 日历同步 hook：检测 gws 状态、按窗口拉取事件、每 10 分钟自动同步并支持手动刷新
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  GoogleCalendarErrorCode,
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleCalendarResult,
  GoogleCalendarStatus,
} from '../../../../../../../shared/googleCalendarTypes';

/** 自动同步间隔：每 10 分钟拉取一次，手动刷新不受影响 */
export const GOOGLE_CALENDAR_SYNC_INTERVAL_MS = 10 * 60 * 1000;
/** 设置开关的存储键；未保存时默认跟随 gws 是否可用 */
export const GOOGLE_CALENDAR_SYNC_STORE_KEY = 'google-calendar-sync';

/** useGoogleCalendar 返回值 */
export interface UseGoogleCalendarResult {
  /** 是否启用同步：设置开关优先，未设置时等于 gws 可用 */
  enabled: boolean;
  /** gws 状态；尚未检测或检测失败时为 null */
  status: GoogleCalendarStatus | null;
  /** 当前窗口内的 Google 事件；未启用或未登录时为空数组 */
  events: GoogleCalendarEvent[];
  /** 最近一次状态或拉取失败的类别，成功后清空 */
  error: GoogleCalendarErrorCode | null;
  /** 重新检测状态并拉取事件 */
  refresh: () => void;
  /** 新建事件，成功后自动刷新 */
  createEvent: (input: GoogleCalendarEventInput) => Promise<GoogleCalendarResult<GoogleCalendarEvent>>;
  /** 整体更新事件，成功后自动刷新 */
  updateEvent: (id: string, input: GoogleCalendarEventInput) => Promise<GoogleCalendarResult<GoogleCalendarEvent>>;
  /** 删除事件，成功后自动刷新 */
  removeEvent: (id: string) => Promise<GoogleCalendarResult<null>>;
}

/**
 * Google 日历同步状态与事件读写
 * @description 设置开关通过 store 订阅同步到其他窗口；状态与拉取结果都以请求是否仍有效为准，丢弃过期响应。
 * @param timeMin - 查询窗口起点的 ISO 8601 字符串
 * @param timeMax - 查询窗口终点的 ISO 8601 字符串
 * @returns 同步状态、事件列表与读写操作
 */
export function useGoogleCalendar(timeMin: string, timeMax: string): UseGoogleCalendarResult {
  const [preference, setPreference] = useState<boolean | null>(null);
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [statusError, setStatusError] = useState<GoogleCalendarErrorCode | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [listError, setListError] = useState<GoogleCalendarErrorCode | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    const apply = (value: unknown): void => {
      if (active) setPreference(typeof value === 'boolean' ? value : null);
    };
    const unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel === `store:${GOOGLE_CALENDAR_SYNC_STORE_KEY}`) apply(value);
    });
    window.api.storeRead(GOOGLE_CALENDAR_SYNC_STORE_KEY).then(apply).catch(() => {
      // 读取失败时保持默认值，即跟随 gws 可用性。
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // 用户明确关闭同步时不启动 gws，避免无谓的子进程开销。
    if (preference === false) return undefined;
    let active = true;
    window.api.gcalStatus().then((result) => {
      if (!active) return;
      if (result.ok) {
        setStatus(result.data);
        setStatusError(null);
      } else {
        setStatus(null);
        setStatusError(result.code);
      }
    }).catch(() => {
      if (active) setStatusError('unknown');
    });
    return () => {
      active = false;
    };
  }, [refreshToken, preference]);

  const available = status?.available === true;
  const enabled = preference ?? available;
  const ready = enabled && available && status?.loggedIn === true;

  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    const load = (): void => {
      window.api.gcalList({ timeMin, timeMax }).then((result) => {
        if (!active) return;
        if (result.ok) {
          setEvents(result.data);
          setListError(null);
        } else {
          setListError(result.code);
        }
      }).catch(() => {
        if (active) setListError('unknown');
      });
    };
    load();
    const timer = window.setInterval(load, GOOGLE_CALENDAR_SYNC_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, timeMin, timeMax, refreshToken]);

  const refresh = useCallback((): void => {
    setRefreshToken((value) => value + 1);
  }, []);

  const createEvent = useCallback(async (input: GoogleCalendarEventInput) => {
    const result = await window.api.gcalCreate(input);
    if (result.ok) refresh();
    return result;
  }, [refresh]);

  const updateEvent = useCallback(async (id: string, input: GoogleCalendarEventInput) => {
    const result = await window.api.gcalUpdate(id, input);
    if (result.ok) refresh();
    return result;
  }, [refresh]);

  const removeEvent = useCallback(async (id: string) => {
    const result = await window.api.gcalRemove(id);
    if (result.ok) refresh();
    return result;
  }, [refresh]);

  return {
    enabled,
    status,
    events: ready ? events : [],
    error: statusError ?? (ready ? listError : null),
    refresh,
    createEvent,
    updateEvent,
    removeEvent,
  };
}
