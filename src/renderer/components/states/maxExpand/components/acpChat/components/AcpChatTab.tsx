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
 * @file AcpChatTab.tsx
 * @description 最大展开模式 — AI 对话 Tab：通过 ACP 驱动本机的 Gemini CLI 或 omp
 * @author 鸡哥
 */

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpConnectionStatus } from '../../../../../../../shared/acpTypes';
import { useAcpChatStore } from '../hooks/useAcpChatStore';
import { AcpInputBar } from './AcpInputBar';
import { AcpMessageList } from './AcpMessageList';
import { AcpPermissionPrompt } from './AcpPermissionPrompt';

/** 连接状态指示点颜色 */
const STATUS_DOT: Record<AcpConnectionStatus, string> = {
  idle: 'bg-[rgba(var(--color-text-rgb),0.3)]',
  starting: 'bg-amber-400 animate-pulse',
  ready: 'bg-emerald-400',
  exited: 'bg-red-400',
  error: 'bg-red-400',
  'not-installed': 'bg-red-400',
};

/**
 * AI 对话 Tab
 * @description 顶部切换供应商，中间是消息与权限面板，底部是输入栏；未安装时显示安装指引
 * @returns 聊天界面元素
 */
export function AcpChatTab(): ReactElement {
  const { t } = useTranslation();
  const providers = useAcpChatStore((state) => state.providers);
  const activeProvider = useAcpChatStore((state) => state.activeProvider);
  const chat = useAcpChatStore((state) => state.chats[state.activeProvider]);
  const init = useAcpChatStore((state) => state.init);
  const refreshProviders = useAcpChatStore((state) => state.refreshProviders);
  const selectProvider = useAcpChatStore((state) => state.selectProvider);
  const send = useAcpChatStore((state) => state.send);
  const stop = useAcpChatStore((state) => state.stop);
  const newChat = useAcpChatStore((state) => state.newChat);
  const resolvePermission = useAcpChatStore((state) => state.resolvePermission);

  useEffect(() => {
    void init();
  }, [init]);

  const info = providers.find((provider) => provider.id === activeProvider);
  const missing = info !== undefined && !info.installed;
  const name = info?.label ?? activeProvider;
  const failed = chat.status === 'error' || chat.status === 'exited';

  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-hidden rounded-xl bg-[rgba(var(--color-text-rgb),0.04)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(var(--color-text-rgb),0.06)] px-3.5 py-2">
        <div className="flex items-center gap-1" role="group" aria-label={t('acpChat.providerSwitch')}>
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              aria-pressed={provider.id === activeProvider}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                provider.id === activeProvider
                  ? 'bg-[rgba(var(--color-text-rgb),0.15)] text-[rgba(var(--color-text-rgb),0.95)]'
                  : 'text-[rgba(var(--color-text-rgb),0.5)] hover:text-[rgba(var(--color-text-rgb),0.8)]'
              }`}
              onClick={() => selectProvider(provider.id)}
            >
              {provider.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-[rgba(var(--color-text-rgb),0.45)]">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[chat.status]}`} aria-hidden="true" />
            {t(`acpChat.status.${chat.status}`)}
          </span>
          <button
            type="button"
            className="rounded-md bg-[rgba(var(--color-text-rgb),0.06)] px-2 py-0.5 text-[11px] text-[rgba(var(--color-text-rgb),0.5)] hover:text-[rgba(var(--color-text-rgb),0.85)]"
            onClick={() => { void newChat(); }}
          >
            {t('acpChat.newChat')}
          </button>
        </div>
      </div>
      {missing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[rgba(var(--color-text-rgb),0.7)]">
          <div className="font-semibold">{t('acpChat.notInstalled.title', { name })}</div>
          <div className="text-xs text-[rgba(var(--color-text-rgb),0.5)]">{t('acpChat.notInstalled.hint')}</div>
          <code className="select-text rounded-md bg-[rgba(var(--color-text-rgb),0.1)] px-3 py-1.5 text-xs">{info.installHint}</code>
          <button
            type="button"
            className="rounded-lg bg-[rgba(var(--color-text-rgb),0.1)] px-3 py-1 text-xs hover:bg-[rgba(var(--color-text-rgb),0.18)]"
            onClick={() => { void refreshProviders(); }}
          >
            {t('acpChat.notInstalled.recheck')}
          </button>
        </div>
      ) : (
        <>
          <AcpMessageList
            items={chat.items}
            busy={chat.busy}
            emptyContent={(
              <div className="flex flex-1 items-center justify-center text-center text-sm text-[rgba(var(--color-text-rgb),0.35)]">
                {t('acpChat.empty', { name })}
              </div>
            )}
          />
          {failed && chat.statusMessage && (
            <div className="mx-4 mb-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300" role="alert">
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all">{chat.statusMessage}</pre>
              <div className="mt-1 text-red-200/70">{t('acpChat.errorHint')}</div>
            </div>
          )}
          {chat.permissions.length > 0 && (
            <AcpPermissionPrompt
              request={chat.permissions[0]}
              queued={chat.permissions.length - 1}
              onResolve={resolvePermission}
            />
          )}
          <AcpInputBar busy={chat.busy} onSend={(text, images) => { void send(text, images); }} onStop={stop} />
        </>
      )}
    </div>
  );
}
