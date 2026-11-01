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
 * @file TimeTab.tsx
 * @description 时间 Tab 内容组件
 * @author 鸡哥
 */

import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIslandTimeStrings } from '../../../../../hooks/useIslandTimeStrings';
import { ActionButtons } from './ActionButtons';
import { CountdownEdit } from './CountdownEdit';
import { MediaButtons } from './MediaButtons';
import type { TimePanelMode, TimeTabProps } from '../types/timeTabTypes';
import { padZero } from '../utils/timerUtils';

/**
 * 时间 Tab 内容
 * @description 展示操作按钮、媒体调节、倒计时工具以及大字号当前时间与日期
 * @param props - 组件入参
 * @returns 时间 Tab 元素
 */
export function TimeTab({
  fullTimeStr,
}: TimeTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const [activePanel, setActivePanel] = useState<TimePanelMode>('countdown');

  const { timeStr, dayStr } = useIslandTimeStrings({
    t,
    language: i18n.resolvedLanguage,
    precision: 'second',
    enabled: true,
  });

  const handlePanelToggle = (panel: Exclude<TimePanelMode, 'countdown'>): void => {
    setActivePanel((current) => current === panel ? 'countdown' : panel);
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = padZero(now.getMonth() + 1);
  const day = padZero(now.getDate());
  const dateText = `${year}/${month}/${day} ${dayStr}`;

  const displayTime = fullTimeStr
    ? (fullTimeStr.includes(' ') ? fullTimeStr.split(' ')[1] : fullTimeStr)
    : `${timeStr}:${padZero(now.getSeconds())}`;
  const timeParts = displayTime.split(':');
  const hh = timeParts[0] ?? '00';
  const mm = timeParts[1] ?? '00';
  const ss = timeParts.length >= 3 ? timeParts[2] : undefined;

  return (
    <div className="time-tab-wrapper">
      <div className="time-tools-grid">
        <ActionButtons />
        <MediaButtons
          activePanel={activePanel}
          onPanelToggle={handlePanelToggle}
        />
        <CountdownEdit activePanel={activePanel} />
      </div>
      <div className="time-tab-divider" />
      <div className="hover-time-panel">
        <div className="hover-time-row">
          <span className="hover-time-large">{hh}:{mm}</span>
          {ss !== undefined && <span className="hover-time-seconds">:{ss}</span>}
        </div>
        <div className="hover-date-row">{dateText}</div>
      </div>
    </div>
  );
}
