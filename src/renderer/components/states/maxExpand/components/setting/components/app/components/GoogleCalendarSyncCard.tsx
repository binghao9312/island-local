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
 * @file GoogleCalendarSyncCard.tsx
 * @description 设置页面 - Google 日历同步开关卡片，未保存过偏好时默认跟随 gws 是否可用
 * @author 鸡哥
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_CALENDAR_SYNC_STORE_KEY } from '../../../../../../expand/pages/CalendarTab/hooks/useGoogleCalendar';

/**
 * 渲染 Google 日历同步开关
 * @description 开关值保存到 store 后，展开日历会通过 store 订阅立即生效，无需重启。
 * @returns 设置卡片元素
 */
export function GoogleCalendarSyncCard(): ReactElement {
  const { t } = useTranslation();
  const [preference, setPreference] = useState<boolean | null>(null);
  // null 表示尚未检测完成，此时不展示缺失提示，避免闪烁。
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loginResult, setLoginResult] = useState<'opened' | 'missing' | 'unsupported' | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(GOOGLE_CALENDAR_SYNC_STORE_KEY).then((value) => {
      if (!cancelled && typeof value === 'boolean') setPreference(value);
    }).catch(() => {
      // 读取失败时沿用默认值，即跟随 gws 可用性。
    });
    window.api.gcalStatus().then((result) => {
      if (!cancelled) setAvailable(result.ok && result.data.available);
    }).catch(() => {
      if (!cancelled) setAvailable(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 保存开关偏好
   * @param next - 新的开关状态
   */
  const handleChange = (next: boolean): void => {
    setPreference(next);
    window.api.storeWrite(GOOGLE_CALENDAR_SYNC_STORE_KEY, next).catch(() => {});
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">{t('settings.app.behavior.googleCalendarTitle', { defaultValue: 'Google 日历同步' })}</div>
        <div className="settings-card-subtitle">{t('settings.app.behavior.googleCalendarHint', { defaultValue: '通过已安装并登录的 gws 命令行工具读取与编辑 Google 日历，eIsland 不保存任何 Google 凭据' })}</div>
      </div>
      <div className="settings-card-inline-row">
        <label className="settings-card-check">
          <input
            type="checkbox"
            checked={preference ?? available === true}
            onChange={(e) => handleChange(e.target.checked)}
          />
          {t('settings.app.behavior.googleCalendarToggle', { defaultValue: '同步 Google 日历' })}
        </label>
        <button
          type="button"
          className="settings-user-secondary-btn"
          onClick={() => {
            window.api.googleOpenLogin().then(setLoginResult).catch(() => {});
            // 重新检测可用性，便于用户登录完成后再次点击刷新状态。
            window.api.gcalStatus().then((result) => setAvailable(result.ok && result.data.available)).catch(() => {});
          }}
        >
          {t('settings.mail.gmail.login', { defaultValue: '登录 Google' })}
        </button>
        {available === false && (
          <span className="settings-card-subtitle">
            {t('expanded.calendar.google.missing', { defaultValue: 'gws CLI not found. Install it to sync Google Calendar.' })}
          </span>
        )}
      </div>
      {loginResult === 'missing' && (
        <div className="settings-field-hint">{t('settings.mail.gmail.loginMissing', { defaultValue: '未找到 gws。请先执行 npm install -g @googleworkspace/cli 安装命令行工具。' })}</div>
      )}
    </div>
  );
}
