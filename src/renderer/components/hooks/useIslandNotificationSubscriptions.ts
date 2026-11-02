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
 * @file useIslandNotificationSubscriptions.ts
 * @description 灵动岛通知事件订阅 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import useIslandStore from '../../store/isLandStore';
import type { NotificationData } from '../../store/types';
import { SvgIcon } from '../../utils/SvgIcon';
import { fetchVersion, reportUpdateDownloadCount } from '../../api/update/versionApi';
import { getWebsiteFaviconUrl, getWebsiteHostname } from '../../api/site/siteMetaApi';
import { CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, UPDATE_SOURCE_STORE_KEY, getUpdateSourceLabel } from '../config/dynamicIslandConfig';

/** 讯息类通知（Discord、Gmail）自动关闭延时（毫秒） */
const MESSAGE_AUTO_DISMISS_MS = 6000;

interface UseIslandNotificationSubscriptionsOptions {
  language: string | undefined;
  t: (key: string, options?: Record<string, unknown>) => string;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
}

/**
 * @description 订阅更新、播放源与剪贴板通知事件。
 * @param options - 通知订阅配置。
 */
export function useIslandNotificationSubscriptions(options: UseIslandNotificationSubscriptionsOptions): void {
  const { language, t, setNotificationRef } = options;
  const updateNotifiedRef = useRef(false);
  useEffect(() => {
    const unsubSwitch = window.api?.onSourceSwitchRequest((data) => {
      setNotificationRef.current({
        title: t('notification.sourceSwitch.title', { defaultValue: '检测到其他播放源' }),
        body: `${data.title} - ${data.artist}（${data.sourceAppId}）`,
        icon: SvgIcon.MUSIC,
        type: 'source-switch',
        sourceAppId: data.sourceAppId,
      });
    });
    return () => {
      unsubSwitch?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubAvailable = window.api?.onUpdaterAvailable?.((data) => {
      if (updateNotifiedRef.current) return;
      updateNotifiedRef.current = true;
      Promise.all([
        fetchVersion().catch(() => null),
        window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null),
      ]).then(([info, source]) => {
        const desc = (info?.description ?? '').trim();
        const updateSourceLabel = getUpdateSourceLabel(source);
        setNotificationRef.current({
          title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
          body: desc || t('notification.update.availableBody', { defaultValue: '是否立即下载？' }),
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion: data.version,
          updateSourceLabel,
        });
      });
    });
    return () => {
      unsubAvailable?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubUpdate = window.api?.onUpdaterDownloaded?.((data) => {
      reportUpdateDownloadCount(data.version).catch(() => {});
      setNotificationRef.current({
        title: t('notification.update.readyTitle', { defaultValue: '更新就绪' }),
        body: t('notification.update.readyBody', {
          defaultValue: '新版本 v{{version}} 已下载完成，是否立即安装？',
          version: data.version,
        }),
        icon: SvgIcon.UPDATE,
        type: 'update-ready',
        updateVersion: data.version,
      });
    });
    return () => {
      unsubUpdate?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubMail = window.api?.onGmailNewMail?.(({ sender, subject, url, count }) => {
      const subjectText = subject || t('notification.mail.noSubject', { defaultValue: '（无主题）' });
      setNotificationRef.current({
        title: sender
          ? t('notification.mail.fromTitle', { defaultValue: '{{sender}} 发来新邮件', sender })
          : t('notification.mail.title', { defaultValue: '收到新邮件' }),
        body: count > 1
          ? `${subjectText} · ${t('notification.mail.moreCount', { defaultValue: '另有 {{count}} 封未读邮件', count: count - 1 })}`
          : subjectText,
        icon: SvgIcon.MAIL,
        type: 'mail',
        mailUrl: url,
        autoDismissMs: MESSAGE_AUTO_DISMISS_MS,
      });
    });
    return () => {
      unsubMail?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubDiscord = window.api?.onDiscordNotification?.(({ title, body }) => {
      setNotificationRef.current({
        title: title || t('notification.discord.title', { defaultValue: 'Discord 新消息' }),
        body,
        icon: SvgIcon.NOTIFICATION,
        type: 'message',
        autoDismissMs: MESSAGE_AUTO_DISMISS_MS,
      });
    });
    return () => {
      unsubDiscord?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubClipboard = window.api?.onClipboardUrlsDetected?.(({ urls, title }) => {
      let suppressInFavorites = true;
      try {
        const raw = localStorage.getItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY);
        if (raw === '0') suppressInFavorites = false;
        if (raw === '1') suppressInFavorites = true;
      } catch {
        // noop
      }

      const store = useIslandStore.getState();
      const appVisible = store.state === 'maxExpand' && !(store.maxExpandAppModeEnabled && store.maxExpandLauncherVisible);
      const isSettingTab = appVisible && store.maxExpandTab === 'settings';
      if (isSettingTab) return;
      if (suppressInFavorites && appVisible && store.maxExpandTab === 'aiChat') return;

      const faviconUrl = getWebsiteFaviconUrl(urls[0]);
      const hostname = getWebsiteHostname(urls[0]);
      setNotificationRef.current({
        title: t('notification.clipboard.detectedTitle', { defaultValue: '检测到链接' }),
        body: title || hostname || urls[0],
        icon: faviconUrl || SvgIcon.LINK,
        type: 'clipboard-url',
        urls,
      });
    });
    return () => {
      unsubClipboard?.();
    };
  }, [language, t, setNotificationRef]);
}
