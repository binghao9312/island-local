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
 * @file useOverviewClockSettings.ts
 * @description 总览时钟样式配置的读取、跨窗口同步与持久化 Hook
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_OVERVIEW_CLOCK_CONFIG,
  OVERVIEW_CLOCK_CONFIG_STORE_KEY,
} from '../config/overviewConfig';
import type { OverviewClockConfig } from '../types/overviewTypes';
import { normalizeOverviewClockConfig } from '../utils/overviewClockUtils';

/**
 * 读取、监听并更新总览时钟样式配置
 * @description 首次渲染加载默认配置，完成 storeRead 或其它窗口广播后自动同步最新值；
 * 调用 updateConfig 时立即更新本地状态并异步写入持久化存储。
 * @returns [当前配置, 更新配置方法]
 */
export function useOverviewClockSettings(): [OverviewClockConfig, (patch: Partial<OverviewClockConfig>) => void] {
  const [config, setConfig] = useState<OverviewClockConfig>(DEFAULT_OVERVIEW_CLOCK_CONFIG);

  useEffect(() => {
    let cancelled = false;

    window.api.storeRead(OVERVIEW_CLOCK_CONFIG_STORE_KEY).then((data) => {
      if (!cancelled) setConfig(normalizeOverviewClockConfig(data));
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (!cancelled && channel === `store:${OVERVIEW_CLOCK_CONFIG_STORE_KEY}`) {
        setConfig(normalizeOverviewClockConfig(value));
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const updateConfig = useCallback((patch: Partial<OverviewClockConfig>): void => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      window.api.storeWrite(OVERVIEW_CLOCK_CONFIG_STORE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return [config, updateConfig];
}
