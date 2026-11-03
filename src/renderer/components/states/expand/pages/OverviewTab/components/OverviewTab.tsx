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
 * @file OverviewTab.tsx
 * @description Expanded 总览 Tab — 仪表盘式概览：时间、天气、音乐状态、倒计时、待办
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { useOverviewClockSettings } from '../hooks/useOverviewClockSettings';
import { useOverviewTab } from '../hooks/useOverviewTab';
import {
  buildOverviewClockStyle,
  formatOverviewDate,
  formatOverviewTime,
} from '../utils/overviewClockUtils';
import { buildGradientClockVars } from '../utils/overviewTabUtils';
import {
  AlbumCarouselWidget,
  BreakReminderWidget,
  CountdownWidget,
  MokugyoWidget,
  PomodoroWidget,
  ShortcutsWidget,
  SongWidget,
  TodoWidget,
  UrlFavoritesWidget,
  WorldClockWidget,
  AlarmWidget,
  PerformanceMonitorWidget,
  AgentQuotaWidget,
} from './OverviewWidgets';
import type { ReactElement, ReactNode } from 'react';
import type { OverviewWidgetType } from '../types/overviewTypes';

/**
 * 总览 Tab
 * @description 展开状态下仪表盘式概览面板
 * @returns 总览面板
 */
export function OverviewTab(): ReactElement {
  const { t } = useTranslation();
  const {
    now,
    todos,
    expandedId,
    apps,
    layoutConfig,
    dragIndexRef,
    dragOverIndex,
    openTargetPage,
    openApp,
    handleAppDragStart,
    handleAppDragOver,
    handleAppDrop,
    handleAppDragEnd,
    toggleExpand,
    toggleDone,
    toggleSubDone,
    removeTodo,
  } = useOverviewTab();
  const [clockConfig] = useOverviewClockSettings();
  const { dominantColor } = useIslandStore(useShallow((store) => ({ dominantColor: store.dominantColor })));
  const { clockStyle: dynamicClockStyle } = buildOverviewClockStyle(clockConfig, dominantColor);
  const gradientClockVars = buildGradientClockVars(layoutConfig);
  const timeText = formatOverviewTime(now, clockConfig.is24Hour, clockConfig.showSeconds);
  const dateText = formatOverviewDate(now, clockConfig.dateFormat, t);
  /**
   * 渲染控件
   * @param type - 控件类型
   * @returns 控件元素
   */
  const renderWidget = (type: OverviewWidgetType): ReactNode => {
    switch (type) {
      case 'shortcuts':
        return (
          <ShortcutsWidget
            apps={apps}
            dragIndex={dragIndexRef.current}
            dragOverIndex={dragOverIndex}
            onOpenApp={openApp}
            onDragStart={handleAppDragStart}
            onDragOver={handleAppDragOver}
            onDrop={handleAppDrop}
            onDragEnd={handleAppDragEnd}
          />
        );
      case 'todo':
        return (
          <TodoWidget
            todos={todos}
            expandedId={expandedId}
            onOpenTodoPage={() => openTargetPage('todo')}
            onToggleExpand={toggleExpand}
            onToggleDone={toggleDone}
            onToggleSubDone={toggleSubDone}
            onRemoveTodo={removeTodo}
          />
        );
      case 'song':
        return <SongWidget />;
      case 'album':
        return <AlbumCarouselWidget openAlbumPage={() => openTargetPage('album')} />;
      case 'countdown':
        return <CountdownWidget openTargetPage={openTargetPage} />;
      case 'pomodoro':
        return <PomodoroWidget />;
      case 'mokugyo':
        return <MokugyoWidget />;
      case 'urlFavorites':
        return <UrlFavoritesWidget openUrlFavoritesPage={() => openTargetPage('urlFavorites')} />;
      case 'breakReminder':
        return <BreakReminderWidget openBreakReminderPage={() => openTargetPage('settings')} />;
      case 'worldClock':
        return <WorldClockWidget />;
      case 'alarm':
        return <AlarmWidget onOpenAlarmPage={() => openTargetPage('alarm')} />;
      case 'performanceMonitor':
        return <PerformanceMonitorWidget />;
      case 'agentQuota':
        return <AgentQuotaWidget />;
      default:
        return null;
    }
  };

  return (
    <div className="expand-tab-panel overview-dashboard">
      {/* ========== 左区 ========== */}
      <div className="ov-dash-slot ov-dash-slot-left">
        {renderWidget(layoutConfig.left)}
      </div>

      {/* ========== 中区：时间（始终居中） ========== */}
      <div className={`ov-dash-time ov-dash-time--${layoutConfig.clockStyle}`} style={gradientClockVars}>
        {clockConfig.showDate && <span className="ov-dash-date">{dateText}</span>}
        <span className="ov-dash-clock" style={dynamicClockStyle}>
          {timeText}
        </span>
      </div>

      {/* ========== 右区 ========== */}
      <div className="ov-dash-slot ov-dash-slot-right">
        {renderWidget(layoutConfig.right)}
      </div>
    </div>
  );
}
