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
 * @file PerformanceMonitorTab.tsx
 * @description Expanded 性能监控 Tab
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { usePerformanceMonitorTab } from '../hooks/usePerformanceMonitorTab';
import { buildPerformanceDashboard } from '../utils/performanceMonitorUtils';
import { MetricCard } from './MetricCard';
import type { ReactElement } from 'react';

/**
 * 性能监控 Tab
 * @description 展开状态下展示 CPU/GPU/内存/磁盘 4 个仪表盘
 * @returns 性能监控面板
 */
export function PerformanceMonitorTab(): ReactElement {
  const { t } = useTranslation();
  const {
    snapshot,
    monitoringEnabled,
    failed,
    chartColors,
    pinned,
    togglePinned,
    startMonitoring,
    stopMonitoring,
    handleHidePage,
    openHardwareSettings,
  } = usePerformanceMonitorTab();

  if (!snapshot) {
    return (
      <div className="expand-tab-panel pm-tab-panel">
        <div className="pm-panel-wrap pm-panel-loading">
          <div className={`pm-loading${monitoringEnabled ? '' : ' pm-loading--idle'}`}>
            {monitoringEnabled && !failed && <span className="pm-loading-spinner" aria-hidden="true" />}
            <span className="pm-loading-text">
              {!monitoringEnabled
                ? t('expanded.performanceMonitor.startHint', { defaultValue: '首次进入请点击开始监控' })
                : failed
                  ? t('expanded.performanceMonitor.error', { defaultValue: '系统性能数据暂不可用' })
                  : t('expanded.performanceMonitor.loading', { defaultValue: '正在读取系统性能数据...' })}
            </span>
            {!monitoringEnabled && (
              <div className="pm-start-actions">
                <button className="pm-start-monitor-btn" type="button" onClick={startMonitoring}>
                  {t('expanded.performanceMonitor.startMonitor', { defaultValue: '开始监控' })}
                </button>
                <button className="pm-start-monitor-btn pm-start-monitor-btn--secondary" type="button" onClick={handleHidePage}>
                  {t('expanded.performanceMonitor.hidePage', { defaultValue: '隐藏本页面' })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { metrics, infoItems } = buildPerformanceDashboard(snapshot, chartColors, t);

  return (
    <div className="expand-tab-panel pm-tab-panel">
      <div className="pm-panel-wrap">
        <div className="pm-dashboard-head">
          <div className="pm-title-group">
            <span className="pm-title">{t('expanded.performanceMonitor.title', { defaultValue: '系统性能' })}</span>
            <div className="pm-subtitle-row">
              <span className="pm-subtitle">{t('expanded.performanceMonitor.subtitle', { defaultValue: '实时硬件状态与温度' })}</span>
              <button
                className={`pm-monitor-toggle-btn${monitoringEnabled ? ' pm-monitor-toggle-btn--stop' : ''}`}
                type="button"
                onClick={monitoringEnabled ? stopMonitoring : startMonitoring}
              >
                {monitoringEnabled
                  ? t('expanded.performanceMonitor.stopMonitor', { defaultValue: '停止监控' })
                  : t('expanded.performanceMonitor.startMonitor', { defaultValue: '开始监控' })}
              </button>
            </div>
          </div>
          <button className="pm-hardware-settings-link" type="button" onClick={openHardwareSettings}>
            {t('expanded.performanceMonitor.hardwareSettingsLink', { defaultValue: '和您的硬件不一样？点击前往调整' })}
          </button>
          <button
            className={`pm-pin-btn${pinned ? ' pm-pin-btn--active' : ''}`}
            type="button"
            aria-pressed={pinned}
            aria-label={pinned
              ? t('expanded.performanceMonitor.unpin', { defaultValue: '取消固定' })
              : t('expanded.performanceMonitor.pin', { defaultValue: '固定常驻' })}
            title={pinned
              ? t('expanded.performanceMonitor.unpinHint', { defaultValue: '取消固定，恢复自动收起' })
              : t('expanded.performanceMonitor.pinHint', { defaultValue: '固定后灵动岛不会自动收起，适合游戏时监控' })}
            onClick={togglePinned}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 17v5" />
              <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7z" />
            </svg>
          </button>
        </div>
        <div className="pm-dashboard-body">
          <div className="pm-info-panel">
            {infoItems.map((item) => (
              <div className="pm-info-row" key={item.label}>
                <span className="pm-info-label">{item.label}</span>
                <span className="pm-info-value">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="pm-metrics-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                valueText={metric.valueText}
                detail={metric.detail}
                temperature={metric.temperature}
                accent={metric.accent}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
