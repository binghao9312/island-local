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
 * @file WeatherSettingsSection.tsx
 * @description 设置页面 - 天气设置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { WeatherLocationPriority } from '../../../../../../../store/utils/storage';

/** CWA 开放资料平台入口，用于申请授权码 */
const CWA_REGISTER_URL = 'https://opendata.cwa.gov.tw/userLogin';

interface WeatherMessage {
  type: 'error' | 'success';
  text: string;
}

interface WeatherSettingsSectionProps {
  weatherLocationPriorityOptions: Array<{ value: WeatherLocationPriority; label: string }>;
  weatherLocationPriority: WeatherLocationPriority;
  applyWeatherLocationPriority: (value: WeatherLocationPriority) => Promise<void>;
  setWeatherLocationConfigMessage: (message: WeatherMessage | null) => void;
  weatherCustomCityInput: string;
  setWeatherCustomCityInput: (value: string) => void;
  testWeatherCustomLocation: () => Promise<void>;
  setWeatherCustomLocationTesting: (value: boolean) => void;
  setWeatherCustomLocationTestMessage: (message: WeatherMessage | null) => void;
  weatherCustomLocationTesting: boolean;
  saveWeatherLocationSettings: () => Promise<void>;
  weatherLocationConfigMessage: WeatherMessage | null;
  weatherCustomLocationTestMessage: WeatherMessage | null;
  cwaApiKeyInput: string;
  setCwaApiKeyInput: (value: string) => void;
  cwaApiKeyMessage: WeatherMessage | null;
  saveCwaApiKeySetting: () => Promise<void>;
  clearCwaApiKeySetting: () => void;
}

/**
 * 渲染天气设置区块
 * @param props - 天气设置区域所需参数
 * @returns 天气设置区域
 */
export function WeatherSettingsSection(props: WeatherSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const locationPriorityKeyMap: Record<WeatherLocationPriority, string> = {
    ip: 'settings.weather.options.locationPriority.ip',
    custom: 'settings.weather.options.locationPriority.custom',
  };
  const {
    weatherLocationPriorityOptions,
    weatherLocationPriority,
    applyWeatherLocationPriority,
    setWeatherLocationConfigMessage,
    weatherCustomCityInput,
    setWeatherCustomCityInput,
    testWeatherCustomLocation,
    setWeatherCustomLocationTesting,
    setWeatherCustomLocationTestMessage,
    weatherCustomLocationTesting,
    saveWeatherLocationSettings,
    weatherLocationConfigMessage,
    weatherCustomLocationTestMessage,
    cwaApiKeyInput,
    setCwaApiKeyInput,
    cwaApiKeyMessage,
    saveCwaApiKeySetting,
    clearCwaApiKeySetting,
  } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.weather', { defaultValue: '天气配置' })}</span>
      </div>

      <div className="settings-app-page-main">
        <div className="settings-cards">
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.weather.cwa.title', { defaultValue: '中央氣象署（CWA）授权码' })}</div>
              <div className="settings-card-subtitle">{t('settings.weather.cwa.hint', { defaultValue: '天气数据来自中央氣象署开放资料平台，需要免费授权码。授权码只保存在本机，不会上传。' })}</div>
            </div>
            <div className="settings-hotkey-row">
              <label className="settings-field" style={{ flex: 1 }}>
                <span className="settings-field-label">{t('settings.weather.cwa.keyLabel', { defaultValue: 'API 授权码' })}</span>
                <input
                  className="settings-field-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t('settings.weather.cwa.keyPlaceholder', { defaultValue: 'CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' })}
                  value={cwaApiKeyInput}
                  onChange={(e) => {
                    setCwaApiKeyInput(e.target.value);
                  }}
                />
              </label>
            </div>
            <div className="settings-hotkey-row">
              <button
                className="settings-hotkey-btn"
                type="button"
                onClick={() => {
                  saveCwaApiKeySetting().catch(() => { });
                }}
              >
                {t('settings.weather.cwa.save', { defaultValue: '保存并验证' })}
              </button>
              <button
                className="settings-hotkey-btn"
                type="button"
                disabled={!cwaApiKeyInput}
                onClick={clearCwaApiKeySetting}
              >
                {t('settings.weather.cwa.clear', { defaultValue: '清除授权码' })}
              </button>
              <button
                className="settings-hotkey-btn"
                type="button"
                onClick={() => {
                  window.api?.clipboardOpenUrl?.(CWA_REGISTER_URL)?.catch(() => { });
                }}
              >
                {t('settings.weather.cwa.register', { defaultValue: '前往申请授权码' })}
              </button>
            </div>
            <div className="settings-music-hint">
              {t('settings.weather.cwa.registerHint', { defaultValue: '在 opendata.cwa.gov.tw 注册并登入后，于「取得授权码」页面获取。' })}
            </div>
            {cwaApiKeyMessage && (
              <div className="settings-music-hint" style={{ color: cwaApiKeyMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                {cwaApiKeyMessage.text}
              </div>
            )}
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.weather.locationPriority.title', { defaultValue: '定位来源优先级' })}</div>
              <div className="settings-card-subtitle">{t('settings.weather.locationPriority.hint', { defaultValue: '选择天气定位优先使用 IP 自动定位或自定义位置' })}</div>
            </div>
            <div className="settings-lyrics-source-options">
              {weatherLocationPriorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`settings-lyrics-source-btn ${weatherLocationPriority === opt.value ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    applyWeatherLocationPriority(opt.value).catch((error: unknown) => {
                      setWeatherLocationConfigMessage({
                        type: 'error',
                        text: t('settings.weather.messages.switchPriorityFailed', {
                          defaultValue: '切换优先级失败：{{error}}',
                          error: error instanceof Error ? error.message : t('settings.common.unknownError', { defaultValue: '未知错误' }),
                        }),
                      });
                    });
                  }}
                >
                  {t(locationPriorityKeyMap[opt.value], { defaultValue: opt.label })}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.weather.customCityTitle', { defaultValue: '自定义城市' })}</div>
              <div className="settings-card-subtitle">{t('settings.weather.customCityHint', { defaultValue: '仅在“自定义位置优先”生效，可先测试再保存；支持縣市 / 鄉鎮市區名称（台 / 臺 均可）。' })}</div>
            </div>
            <div className="settings-hotkey-row">
              <label className="settings-field" style={{ flex: 1 }}>
                <span className="settings-field-label">{t('settings.weather.cityName', { defaultValue: '城市名称' })}</span>
                <input
                  className="settings-field-input"
                  type="text"
                  placeholder={t('settings.weather.cityPlaceholder', { defaultValue: '例如：台北 / 新北市新店區 / 高雄' })}
                  value={weatherCustomCityInput}
                  onChange={(e) => {
                    setWeatherCustomCityInput(e.target.value);
                  }}
                />
              </label>
            </div>
            <div className="settings-hotkey-row">
              <button
                className="settings-hotkey-btn"
                type="button"
                onClick={() => {
                  testWeatherCustomLocation().catch((error: unknown) => {
                    setWeatherCustomLocationTesting(false);
                    setWeatherCustomLocationTestMessage({
                      type: 'error',
                      text: t('settings.weather.messages.testFailed', {
                        defaultValue: '测试失败：{{error}}',
                        error: error instanceof Error ? error.message : t('settings.common.unknownError', { defaultValue: '未知错误' }),
                      }),
                    });
                  });
                }}
                disabled={weatherCustomLocationTesting}
              >
                {weatherCustomLocationTesting
                  ? t('settings.weather.testing', { defaultValue: '测试中...' })
                  : t('settings.weather.testCustomLocation', { defaultValue: '测试自定义位置（CWA）' })}
              </button>
              <button
                className="settings-hotkey-btn"
                type="button"
                onClick={() => {
                  saveWeatherLocationSettings().catch((error: unknown) => {
                    setWeatherLocationConfigMessage({
                      type: 'error',
                      text: t('settings.common.saveFailed', {
                        defaultValue: '保存失败：{{error}}',
                        error: error instanceof Error ? error.message : t('settings.common.unknownError', { defaultValue: '未知错误' }),
                      }),
                    });
                  });
                }}
              >
                {t('settings.weather.saveLocation', { defaultValue: '保存定位配置' })}
              </button>
            </div>
            {weatherLocationConfigMessage && (
              <div className="settings-music-hint" style={{ color: weatherLocationConfigMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                {weatherLocationConfigMessage.text}
              </div>
            )}
            {weatherCustomLocationTestMessage && (
              <div className="settings-music-hint" style={{ color: weatherCustomLocationTestMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                {weatherCustomLocationTestMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
