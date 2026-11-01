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
 * @file WeatherTab.tsx
 * @description 天气 Tab 内容组件
 * @author 鸡哥
 */

import { type SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import { abbreviateWeatherDescription } from '../../../../../../utils/weatherText';
import '../../../../../../styles/hover/weather-tab.css';
import { FALLBACK_WEATHER_ICON, SETTINGS_OPEN_TAB_STORE_KEY, WEATHER_SETTINGS_TAB } from '../config/weatherConfig';
import {
  getWeekLabel,
  getWeatherIconPath,
  getWeatherSmallIconPath,
  formatHumidityText,
  formatPrecipitationText,
  formatWindText,
} from '../utils/weatherUtils';

/** 空状态对应的天气请求状态 */
const EMPTY_STATE_KEYS = {
  'no-key': 'noKey',
  'invalid-key': 'invalidKey',
  'out-of-region': 'outOfRegion',
} as const;

/**
 * 天气 Tab 内容
 * @description 显示当前气温、湿度 / 降雨机率 / 风速三项指标及未来两天预报；未设置 CWA 授权码时显示空状态
 * @returns 天气 Tab 元素
 */
export function WeatherTab(): React.ReactElement {
  const { t } = useTranslation();
  const weather = useIslandStore(s => s.weather);
  const weatherStatus = useIslandStore(s => s.weatherStatus);
  const location = useIslandStore(s => s.location);
  const fetchWeatherData = useIslandStore(s => s.fetchWeatherData);
  const setMaxExpand = useIslandStore(s => s.setMaxExpand);
  const setMaxExpandTab = useIslandStore(s => s.setMaxExpandTab);
  const [refreshing, setRefreshing] = useState(false);
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;
  const currentWeatherDesc = abbreviateWeatherDescription(weather.description, t);

  const handleIconError = (event: SyntheticEvent<HTMLImageElement>): void => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_WEATHER_ICON;
  };

  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchWeatherData(undefined, true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenSettings = (): void => {
    window.api?.storeWrite?.(SETTINGS_OPEN_TAB_STORE_KEY, WEATHER_SETTINGS_TAB)?.catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  const emptyStateKey = weatherStatus === 'no-key' || weatherStatus === 'invalid-key' || weatherStatus === 'out-of-region'
    ? EMPTY_STATE_KEYS[weatherStatus]
    : null;

  if (emptyStateKey) {
    return (
      <div className="weather-tab weather-tab-empty">
        <img src={FALLBACK_WEATHER_ICON} alt="" className="weather-tab-icon" />
        <div className="weather-tab-empty-text">
          <span className="text-xs leading-tight">{t(`hover.weather.empty.${emptyStateKey}.title`, { defaultValue: '尚未设置 CWA 授权码' })}</span>
          <span className="text-[10px] opacity-60 leading-tight">{t(`hover.weather.empty.${emptyStateKey}.hint`, { defaultValue: '到 设置 → 天气 → 接口配置 填入中央氣象署授权码' })}</span>
        </div>
        {emptyStateKey !== 'outOfRegion' && (
          <button type="button" className="weather-tab-empty-btn" onClick={handleOpenSettings}>
            {t('hover.weather.empty.openSettings', { defaultValue: '前往设置' })}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="weather-tab">
      {/* 左侧：当前天气大图标（点击刷新） */}
      <img
        src={getWeatherIconPath(weather.iconCode, isDay)}
        alt={currentWeatherDesc}
        className={`weather-tab-icon weather-tab-icon-clickable${refreshing ? ' weather-tab-icon-spinning' : ''}`}
        onClick={handleRefresh}
        onError={handleIconError}
        title={t('hover.weather.refreshTitle', { defaultValue: '点击刷新天气' })}
      />

      {/* 左侧：大号当前气温 + 天气描述 + 位置 */}
      <div className="weather-tab-left">
        <div className="weather-tab-current">
          <span className="text-[10px] opacity-60 leading-tight">
            {location?.city ?? t('hover.weather.unknownCity', { defaultValue: '未知' })}
          </span>
          <span className="weather-tab-big-temp tabular-nums">{weather.temperature}°</span>
          <span className="text-[10px] opacity-60 leading-tight">
            {t('hover.weather.today', { defaultValue: '今日天气' })} {currentWeatherDesc}
          </span>
        </div>

        {/* 三项指标：湿度、降雨机率、风速 */}
        <div className="weather-tab-metrics">
          <div className="weather-tab-metric">
            <span className="weather-tab-metric-label">{t('hover.weather.metrics.humidity', { defaultValue: '湿度' })}</span>
            <span className="weather-tab-metric-value tabular-nums">{formatHumidityText(weather.humidity, t)}</span>
          </div>
          <div className="weather-tab-metric">
            <span className="weather-tab-metric-label">{t('hover.weather.metrics.rain', { defaultValue: '降雨' })}</span>
            <span className="weather-tab-metric-value tabular-nums">{formatPrecipitationText(weather.precipitationProbability ?? -1, t)}</span>
          </div>
          <div className="weather-tab-metric">
            <span className="weather-tab-metric-label">{t('hover.weather.metrics.wind', { defaultValue: '风速' })}</span>
            <span className="weather-tab-metric-value tabular-nums">{formatWindText(weather.windSpeed, t)}</span>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="weather-tab-divider" />

      {/* 右侧：未来两天预报 - 上下排列，完整参数 */}
      <div className="weather-tab-forecast">
        {weather.forecast.map((day, index) => (
          <div key={`${getWeekLabel(index, t)}-${day.description}-${day.iconCode}-${day.temperatureMin}-${day.temperatureMax}`} className="weather-tab-forecast-row">
            <span className="text-xs opacity-60 w-6 leading-none">{getWeekLabel(index, t)}</span>
            <img
              src={getWeatherSmallIconPath(day.iconCode, isDay)}
              alt={abbreviateWeatherDescription(day.description, t)}
              className="weather-tab-forecast-icon"
              onError={handleIconError}
            />
            <span className="text-xs leading-none">{abbreviateWeatherDescription(day.description, t)}</span>
            <span className="text-[10px] opacity-40 leading-none">{t('hover.weather.rainPrefix', { defaultValue: '雨' })}{formatPrecipitationText(day.precipitationProbability, t)}</span>
            <span className="text-[10px] opacity-40 leading-none">{t('hover.weather.windPrefix', { defaultValue: '风' })}{formatWindText(day.windSpeed, t)}</span>
            <span className="text-xs tabular-nums leading-none">
              {(day.temperatureMin + day.temperatureMax) / 2}℃
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
