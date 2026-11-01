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
 * @file useIslandStartupUpdateCheck.ts
 * @description 启动阶段更新检查与天气预警提醒 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import { fetchUpdateSourceUrl } from '../../api/user/userAccountApi';
import { readLocalToken } from '../../utils/userAccount';
import {
  UPDATE_SOURCE_STORE_KEY,
  UPDATE_AUTO_PROMPT_STORE_KEY,
  normalizeUpdateSource,
  isProOnlyUpdateSource,
  getRoleFromToken,
} from '../config/dynamicIslandConfig';
import { UPDATES_ENABLED } from '../../../shared/updatesConfig';
import type { UpdateSourceKey } from '../config/dynamicIslandConfig';

const STARTUP_PRECHECK_TIMEOUT_MS = 30_000;

interface UseIslandStartupUpdateCheckOptions {
  language: string | undefined;
  startupAutoCheckHandledRef: React.MutableRefObject<boolean>;
}

/**
 * @description 处理启动时的自动更新检查。
 * @param options - 启动更新检查配置。
 */
export function useIslandStartupUpdateCheck(options: UseIslandStartupUpdateCheckOptions): void {
  const {
    language,
    startupAutoCheckHandledRef,
  } = options;

  const finishStartupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { finishStartupRef.current?.(); }, []);

  useEffect(() => {
    const unsub = window.api?.onUpdaterStartupAutoCheckRequest?.(() => {
      if (startupAutoCheckHandledRef.current) return;
      startupAutoCheckHandledRef.current = true;
      let finished = false;
      let startupSource: UpdateSourceKey = 'cloudflare-r2';
      let startupResolvedUrl: string | undefined;
      let precheckTimeout: ReturnType<typeof setTimeout> | undefined;
      const continueStartupUpdateCheck = (): void => {
        if (finished) return;
        finished = true;
        clearTimeout(precheckTimeout);
        precheckTimeout = undefined;
        finishStartupRef.current = null;
        // 更新检测关闭时不发起任何更新检查。
        if (!UPDATES_ENABLED) return;
        if (isProOnlyUpdateSource(startupSource) && !startupResolvedUrl) startupSource = 'cloudflare-r2';
        const check = async (): Promise<void> => {
          try {
            await window.api?.updaterCheck(startupSource, startupResolvedUrl);
          } catch (error) {
            console.warn('[Updater] startup update check failed:', error);
          }
        };
        // eslint-disable-next-line promise/prefer-await-to-then -- Zustand 回调同步结束，更新 IPC 的异步拒绝单独处理。
        check().catch(console.error);
      };
      precheckTimeout = setTimeout(() => {
        console.warn('[Updater] startup pre-check timed out, continuing update check');
        continueStartupUpdateCheck();
      }, STARTUP_PRECHECK_TIMEOUT_MS);
      finishStartupRef.current = continueStartupUpdateCheck;
      const precheck = async (): Promise<void> => {
        try {
          if (UPDATES_ENABLED) {
            const autoPromptValue = await window.api?.storeRead?.(UPDATE_AUTO_PROMPT_STORE_KEY).catch(() => null);
            if (finished) return;
            const autoPromptEnabled = typeof autoPromptValue === 'boolean' ? autoPromptValue : true;
            if (!autoPromptEnabled) {
              finished = true;
              clearTimeout(precheckTimeout);
              precheckTimeout = undefined;
              finishStartupRef.current = null;
              return;
            }
          }

          const token = readLocalToken();
          const isProUser = getRoleFromToken(token) === 'pro';
          if (UPDATES_ENABLED) {
            const sourceRaw = await window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null);
            if (finished) return;
            startupSource = normalizeUpdateSource(sourceRaw);

            if (isProOnlyUpdateSource(startupSource)) {
              if (!token || !isProUser) {
                startupSource = 'cloudflare-r2';
              } else {
                const resolved = await fetchUpdateSourceUrl(token, startupSource);
                if (finished) return;
                if (resolved.ok && resolved.data?.url) {
                  startupResolvedUrl = resolved.data.url;
                } else {
                  startupSource = 'cloudflare-r2';
                }
              }
            }
          }

          continueStartupUpdateCheck();
        } catch (error) {
          console.warn('[Updater] startup pre-check failed, continuing update check:', error);
          continueStartupUpdateCheck();
        }
      };
      // eslint-disable-next-line promise/prefer-await-to-then -- 启动事件回调同步返回，预检查内部已处理异常。
      precheck().catch(console.error);
    });
    return () => {
      unsub?.();
    };
  }, [language, startupAutoCheckHandledRef]);
}
