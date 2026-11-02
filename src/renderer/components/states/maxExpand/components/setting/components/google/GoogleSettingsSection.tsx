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
 * @file GoogleSettingsSection.tsx
 * @description 设置页面 - Google 账号区块：登录状态卡片、Gmail 新邮件提醒与 Google 日历同步
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleCalendarSyncCard } from '../app/components/GoogleCalendarSyncCard';
import { GmailReminderCard } from '../mail/GmailReminderCard';

/** Google 登录状态：checking 为检测中，其余为检测结果 */
type GoogleLoginStatus = 'checking' | 'loggedIn' | 'notLoggedIn' | 'missing' | 'error';

/**
 * 渲染 Google 账号设置区块
 * @description 登录由 gws 完成，eIsland 不保存任何凭据；状态通过 gcalStatus 查询。
 * @returns 设置区块元素
 */
export function GoogleSettingsSection(): ReactElement {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GoogleLoginStatus>('checking');
  const [loginResult, setLoginResult] = useState<'opened' | 'missing' | 'unsupported' | null>(null);

  const statusText: Record<GoogleLoginStatus, string> = {
    checking: t('settings.google.status.checking', { defaultValue: '检查中…' }),
    loggedIn: t('settings.google.status.loggedIn', { defaultValue: '已登录 Google' }),
    notLoggedIn: t('settings.google.status.notLoggedIn', { defaultValue: '未登录 Google，请点击「登录 Google」' }),
    missing: t('settings.google.status.missing', { defaultValue: '未找到 gws 命令行工具，请先安装 Google Workspace CLI' }),
    error: t('settings.google.status.error', { defaultValue: '检查登录状态失败，请稍后重试' }),
  };

  /** 重新查询 gws 可用性与登录状态 */
  const checkStatus = useCallback((): void => {
    setStatus('checking');
    window.api.gcalStatus().then((result) => {
      if (!result.ok) setStatus('error');
      else if (!result.data.available) setStatus('missing');
      else setStatus(result.data.loggedIn ? 'loggedIn' : 'notLoggedIn');
    }).catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.google', { defaultValue: 'Google 账号' })}</span>
      </div>

      <div className="settings-app-page-main">
        <div className="settings-cards">
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings.google.title', { defaultValue: 'Google 账号' })}</div>
              <div className="settings-card-subtitle">{t('settings.google.hint', { defaultValue: 'eIsland 使用 Google Workspace CLI（gws）的登录状态访问 Google 服务，不保存任何凭据。' })}</div>
            </div>
            <div className="settings-card-inline-row">
              <button
                type="button"
                className="settings-user-secondary-btn"
                onClick={() => {
                  window.api.googleOpenLogin().then(setLoginResult).catch(() => {});
                }}
              >
                {t('settings.google.login', { defaultValue: '登录 Google' })}
              </button>
              <button
                type="button"
                className="settings-user-secondary-btn"
                disabled={status === 'checking'}
                onClick={checkStatus}
              >
                {t('settings.google.recheck', { defaultValue: '重新检查' })}
              </button>
            </div>
            {loginResult === 'missing' && (
              <div className="settings-field-hint">{t('settings.google.loginMissing', { defaultValue: '未找到 gws。请先执行 npm install -g @googleworkspace/cli 安装命令行工具。' })}</div>
            )}
            <div className="settings-field-hint">{statusText[status]}</div>
          </div>

          <GmailReminderCard />
          <GoogleCalendarSyncCard />
        </div>
      </div>
    </div>
  );
}
