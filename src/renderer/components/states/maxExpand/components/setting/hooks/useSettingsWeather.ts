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
 * @file useSettingsWeather.ts
 * @description 天气定位、CWA 授权码及自定义位置测试操作
 * @author 鸡哥
 */

import { useState } from 'react';
import type { useTranslation } from 'react-i18next';
import { CwaError, fetchCwaWeather } from '../../../../../../api/weather/cwa/cwaApi';
import { resolveLocationByKeyword } from '../../../../../../api/weather/geocodingApi';
import type { ResolvedLocation } from '../../../../../../api/weather/geocodingApi';
import {
  type WeatherCustomLocationConfig,
  type WeatherLocationPriority,
  DEFAULT_WEATHER_LOCATION_PRIORITY,
  loadCwaApiKey,
  loadWeatherLocationConfig,
  saveCwaApiKey,
  saveWeatherLocationConfig,
} from '../../../../../../store/utils/storage';
import type { useSettingsStore } from './useSettingsStore';

interface SettingsWeatherOptions {
  t: ReturnType<typeof useTranslation>['t'];
  fetchWeatherData: ReturnType<typeof useSettingsStore>['fetchWeatherData'];
}

interface SettingsMessage {
  type: 'success' | 'error';
  text: string;
}

/**
 * 将地理编码结果转换为可持久化的自定义位置配置（含 CWA 縣市 / 鄉鎮映射）。
 * @param resolved - 地理编码解析结果
 * @returns 自定义位置配置
 */
export function toCustomLocationConfig(resolved: ResolvedLocation): WeatherCustomLocationConfig {
  return {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    city: resolved.city,
    ...(resolved.countryCode ? { countryCode: resolved.countryCode, country: resolved.country ?? '', regionName: resolved.regionName ?? '' } : {}),
    ...(resolved.county ? { county: resolved.county } : {}),
    ...(resolved.township ? { township: resolved.township } : {}),
  };
}

/**
 * 天气定位、CWA 授权码及自定义位置测试操作。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsWeather(options: SettingsWeatherOptions) {
  const { t, fetchWeatherData } = options;
  const [weatherLocationPriority, setWeatherLocationPriority] = useState<WeatherLocationPriority>(DEFAULT_WEATHER_LOCATION_PRIORITY);
  const [weatherCustomCityInput, setWeatherCustomCityInput] = useState<string>('');
  const [cwaApiKeyInput, setCwaApiKeyInput] = useState<string>(() => loadCwaApiKey());
  const [cwaApiKeyMessage, setCwaApiKeyMessage] = useState<SettingsMessage | null>(null);
  const [weatherLocationConfigMessage, setWeatherLocationConfigMessage] = useState<SettingsMessage | null>(null);
  const [weatherCustomLocationTesting, setWeatherCustomLocationTesting] = useState(false);
  const [weatherCustomLocationTestMessage, setWeatherCustomLocationTestMessage] = useState<SettingsMessage | null>(null);

  const applyWeatherLocationPriority = async (nextPriority: WeatherLocationPriority): Promise<void> => {
    setWeatherLocationPriority(nextPriority);

    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    try {
      const city = weatherCustomCityInput.trim();
      const existing = loadWeatherLocationConfig().customLocation;
      let customLocation = existing;

      if (city) {
        customLocation = toCustomLocationConfig(await resolveLocationByKeyword(city));
      }

      saveWeatherLocationConfig({
        priority: nextPriority,
        customLocation: customLocation || null,
      });

      setWeatherLocationConfigMessage({
        type: nextPriority === 'custom' && !customLocation ? 'error' : 'success',
        text: nextPriority === 'custom' && !customLocation
          ? t('settings.weather.messages.customMissingFallback', {
            defaultValue: '已切换为自定义位置优先，但未配置城市，将自动回退到 IP 定位',
          })
          : t('settings.weather.messages.priorityApplied', {
            defaultValue: '定位来源优先级已立即生效',
          }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => { });
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.switchPriorityFailed', {
          defaultValue: '切换优先级失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  const saveWeatherLocationSettings = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (weatherLocationPriority === 'custom' && !city) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.customNeedsCity', { defaultValue: '选择“自定义位置优先”时请先输入城市名称' }),
      });
      return;
    }

    try {
      let customLocation: WeatherCustomLocationConfig | null = null;
      if (city) {
        customLocation = toCustomLocationConfig(await resolveLocationByKeyword(city));
      }

      saveWeatherLocationConfig({
        priority: weatherLocationPriority,
        customLocation,
      });
      setWeatherLocationConfigMessage({
        type: 'success',
        text: customLocation
          ? t('settings.weather.messages.configSavedWithCity', {
            defaultValue: '天气定位配置已保存（{{city}} {{lat}}, {{lng}}）',
            city: customLocation.city ?? city,
            lat: customLocation.latitude.toFixed(4),
            lng: customLocation.longitude.toFixed(4),
          })
          : t('settings.weather.messages.configSaved', { defaultValue: '天气定位配置已保存' }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => { });
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  /**
   * 将 CWA 错误转换为用户可读提示。
   * @param error - 捕获到的错误
   * @returns 本地化提示文本
   */
  const describeCwaError = (error: unknown): string => {
    const code = error instanceof CwaError ? error.code : null;
    if (code === 'no-key') return t('settings.weather.cwa.status.noKey', { defaultValue: '尚未设置 CWA 授权码' });
    if (code === 'invalid-key') return t('settings.weather.cwa.status.invalidKey', { defaultValue: 'CWA 授权码无效' });
    if (code === 'out-of-region') return t('settings.weather.cwa.status.outOfRegion', { defaultValue: '该位置不在台湾，CWA 无法提供天气' });
    return t('settings.weather.messages.providerUnavailable', {
      defaultValue: '{{name}} 不可用：{{error}}',
      name: 'CWA',
      error: error instanceof Error ? error.message : t('settings.common.unknownError', { defaultValue: '未知错误' }),
    });
  };

  const testWeatherCustomLocation = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (!city) {
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityRequired', { defaultValue: '请先输入城市名称后再测试' }),
      });
      return;
    }

    setWeatherCustomLocationTesting(true);
    setWeatherCustomLocationTestMessage(null);

    let custom: ResolvedLocation;
    try {
      custom = await resolveLocationByKeyword(city);
    } catch (error) {
      setWeatherCustomLocationTesting(false);
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
      return;
    }

    const describe = (details: string): string => t('settings.weather.messages.testResult', {
      defaultValue: '{{city}}（{{lat}}, {{lng}}） - {{details}}',
      city: custom.city,
      lat: custom.latitude.toFixed(4),
      lng: custom.longitude.toFixed(4),
      details,
    });

    try {
      const weather = await fetchCwaWeather({
        latitude: custom.latitude,
        longitude: custom.longitude,
        city: custom.city,
        county: custom.county,
        township: custom.township,
        countryCode: custom.countryCode,
      });
      setWeatherCustomLocationTestMessage({
        type: 'success',
        text: describe(t('settings.weather.messages.cwaAvailable', {
          defaultValue: 'CWA 可用：{{temperature}}°C {{description}}',
          temperature: weather.temperature,
          description: weather.description,
        })),
      });
    } catch (error) {
      setWeatherCustomLocationTestMessage({ type: 'error', text: describe(describeCwaError(error)) });
    } finally {
      setWeatherCustomLocationTesting(false);
    }
  };

  /**
   * 保存 CWA 授权码并立即刷新天气，按刷新结果提示授权码是否可用。
   */
  const saveCwaApiKeySetting = async (): Promise<void> => {
    const key = cwaApiKeyInput.trim();
    saveCwaApiKey(key);
    setCwaApiKeyInput(key);
    if (!key) {
      setCwaApiKeyMessage({ type: 'success', text: t('settings.weather.cwa.messages.cleared', { defaultValue: '已清除 CWA 授权码' }) });
      fetchWeatherData(undefined, true).catch(() => { });
      return;
    }
    setCwaApiKeyMessage({ type: 'success', text: t('settings.weather.cwa.messages.checking', { defaultValue: '已保存，正在验证…' }) });
    const status = await fetchWeatherData(undefined, true);
    if (status === 'ok') {
      setCwaApiKeyMessage({ type: 'success', text: t('settings.weather.cwa.messages.valid', { defaultValue: '授权码可用，天气已更新' }) });
    } else if (status === 'invalid-key') {
      setCwaApiKeyMessage({ type: 'error', text: t('settings.weather.cwa.messages.invalid', { defaultValue: '授权码无效，请确认是否完整复制' }) });
    } else if (status === 'out-of-region') {
      setCwaApiKeyMessage({ type: 'success', text: t('settings.weather.cwa.messages.savedOutOfRegion', { defaultValue: '已保存；当前位置不在台湾，CWA 无法提供天气' }) });
    } else {
      setCwaApiKeyMessage({ type: 'error', text: t('settings.weather.cwa.messages.checkFailed', { defaultValue: '已保存，但天气更新失败，请检查网络后重试' }) });
    }
  };

  /**
   * 清除已保存的 CWA 授权码并刷新天气（界面回到未设置的空状态）。
   */
  const clearCwaApiKeySetting = (): void => {
    setCwaApiKeyInput('');
    saveCwaApiKey('');
    setCwaApiKeyMessage({ type: 'success', text: t('settings.weather.cwa.messages.cleared', { defaultValue: '已清除 CWA 授权码' }) });
    fetchWeatherData(undefined, true).catch(() => { });
  };

  return {
    weatherLocationPriority,
    setWeatherLocationPriority,
    weatherCustomCityInput,
    setWeatherCustomCityInput,
    weatherLocationConfigMessage,
    setWeatherLocationConfigMessage,
    weatherCustomLocationTesting,
    setWeatherCustomLocationTesting,
    weatherCustomLocationTestMessage,
    setWeatherCustomLocationTestMessage,
    cwaApiKeyInput,
    setCwaApiKeyInput,
    cwaApiKeyMessage,
    applyWeatherLocationPriority,
    saveWeatherLocationSettings,
    testWeatherCustomLocation,
    saveCwaApiKeySetting,
    clearCwaApiKeySetting,
  };
}
