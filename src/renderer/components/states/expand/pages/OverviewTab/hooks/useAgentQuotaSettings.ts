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
 * @file useAgentQuotaSettings.ts
 * @description Agent 额度卡片设置的读取、跨窗口同步与保存，设置页与总览卡片共用同一存储键。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import { AGENT_QUOTA_SETTINGS_STORE_KEY, DEFAULT_AGENT_QUOTA_SETTINGS } from '../config/overviewConfig';
import type { AgentQuotaSettings } from '../types/overviewTypes';
import { normalizeAgentQuotaSettings } from '../utils/overviewTabUtils';

/**
 * 读取并同步 Agent 额度卡片设置。
 * @description 首次渲染使用默认值，存储读取完成或其它窗口修改后再替换；保存时先更新本地状态以即时预览。
 * @returns 当前设置与保存方法
 */
export function useAgentQuotaSettings(): [AgentQuotaSettings, (next: AgentQuotaSettings) => void] {
  const [settings, setSettings] = useState<AgentQuotaSettings>(DEFAULT_AGENT_QUOTA_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(AGENT_QUOTA_SETTINGS_STORE_KEY).then((data) => {
      if (!cancelled) setSettings(normalizeAgentQuotaSettings(data));
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (!cancelled && channel === `store:${AGENT_QUOTA_SETTINGS_STORE_KEY}`) {
        setSettings(normalizeAgentQuotaSettings(value));
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const saveSettings = useCallback((next: AgentQuotaSettings): void => {
    setSettings(next);
    window.api.storeWrite(AGENT_QUOTA_SETTINGS_STORE_KEY, next).catch(() => {});
  }, []);

  return [settings, saveSettings];
}
