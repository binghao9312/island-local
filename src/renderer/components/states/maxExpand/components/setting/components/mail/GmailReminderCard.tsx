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
 * @file GmailReminderCard.tsx
 * @description 设置页收信设置内的 Gmail 新邮件提醒卡片：开关、立即检查与状态行
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { GmailReminderStatus } from '../../../../../../../../shared/gmailReminderTypes';

/** Gmail 状态种类到状态行文案键的映射 */
const STATUS_TEXT_KEYS: Record<GmailReminderStatus['kind'], string> = {
  ok: 'settings.mail.gmail.status.ok',
  disabled: 'settings.mail.gmail.status.disabled',
  missing: 'settings.mail.gmail.status.missing',
  'not-logged-in': 'settings.mail.gmail.status.notLoggedIn',
  network: 'settings.mail.gmail.status.network',
  error: 'settings.mail.gmail.status.error',
};

/**
 * Gmail 新邮件提醒设置卡片。仅通过 gws 只读访问，不保存任何凭据。
 * @returns 卡片节点
 */
export function GmailReminderCard(): ReactElement {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean>(false);
  const [status, setStatus] = useState<GmailReminderStatus | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [loginResult, setLoginResult] = useState<'opened' | 'missing' | 'unsupported' | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.gmailRemindersEnabledGet().then((value) => {
      if (!cancelled) setEnabled(value);
    }).catch(() => {});
    window.api.gmailStatusGet().then((value) => {
      if (!cancelled) setStatus(value);
    }).catch(() => {});
    const unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel === 'gmail:status' && !cancelled) setStatus(value as GmailReminderStatus);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">{t('settings.mail.gmail.title', { defaultValue: 'Gmail 新邮件提醒' })}</div>
        <div className="settings-card-subtitle">{t('settings.mail.gmail.hint', { defaultValue: '通过已登录的 Google Workspace CLI（gws）只读检查未读邮件，有新邮件时在灵动岛提醒。不保存任何凭据。' })}</div>
      </div>
      <div className="settings-card-inline-row">
        <label className="settings-card-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              window.api.gmailRemindersEnabledSet(e.target.checked).catch(() => {});
            }}
          />
          {t('settings.mail.gmail.toggle', { defaultValue: '启用新邮件提醒' })}
        </label>
        <button
          type="button"
          className="settings-user-secondary-btn"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            window.api.gmailCheckNow()
              .then(setStatus)
              .catch(() => {})
              .finally(() => setChecking(false));
          }}
        >
          {t('settings.mail.gmail.checkNow', { defaultValue: '立即检查' })}
        </button>
        <button
          type="button"
          className="settings-user-secondary-btn"
          onClick={() => {
            window.api.googleOpenLogin().then(setLoginResult).catch(() => {});
          }}
        >
          {t('settings.mail.gmail.login', { defaultValue: '登录 Google' })}
        </button>
      </div>
      {loginResult === 'missing' && (
        <div className="settings-field-hint">{t('settings.mail.gmail.loginMissing', { defaultValue: '未找到 gws。请先执行 npm install -g @googleworkspace/cli 安装命令行工具。' })}</div>
      )}
      {status && (
        <div className="settings-field-hint">{t(STATUS_TEXT_KEYS[status.kind])}</div>
      )}
    </div>
  );
}
