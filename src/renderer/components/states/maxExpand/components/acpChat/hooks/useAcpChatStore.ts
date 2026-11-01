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
 * @file useAcpChatStore.ts
 * @description ACP 聊天的全局状态：独立于标签页挂载周期，切走标签页时流式更新不会丢失
 * @author 鸡哥
 */

import { create } from 'zustand';
import type { AcpImageData, AcpProviderId, AcpProviderInfo } from '../../../../../../../shared/acpTypes';
import { applyAcpEvent, beginTurn, createEmptyChat, createInitialChats, endTurn, patchChat } from '../utils/acpChatState';
import type { AcpChats } from '../utils/acpChatState';

const ACTIVE_PROVIDER_KEY = 'eIsland_acpActiveProvider';

/** 聊天状态与操作 */
interface AcpChatStore {
  /** 供应商列表及安装状态 */
  providers: AcpProviderInfo[];
  /** 当前选中的供应商 */
  activeProvider: AcpProviderId;
  /** 各供应商的聊天状态 */
  chats: AcpChats;
  /** 订阅主进程事件并读取供应商列表，可重复调用 */
  init: () => Promise<void>;
  /** 重新检测供应商是否已安装 */
  refreshProviders: () => Promise<void>;
  /** 切换供应商 */
  selectProvider: (providerId: AcpProviderId) => void;
  /** 发送一条消息 */
  send: (text: string, images: AcpImageData[]) => Promise<void>;
  /** 停止当前一轮 */
  stop: () => void;
  /** 重启进程并清空当前供应商的对话 */
  newChat: () => Promise<void>;
  /** 回复队首权限请求，null 表示拒绝 */
  resolvePermission: (optionId: string | null) => void;
}

/**
 * 读取上次选中的供应商，默认 antigravity
 * @returns 供应商标识，默认 antigravity
 */
function loadActiveProvider(): AcpProviderId {
  try {
    const saved = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (saved === 'gemini' || saved === 'omp' || saved === 'antigravity') {
      return saved;
    }
  } catch {
    // 默认使用 antigravity
  }
  return 'antigravity';
}

let unsubscribeEvents: (() => void) | null = null;

/** 每次重置会话递增；被重置打断的提问不应再把错误写进新会话 */
const turnEpoch: Record<AcpProviderId, number> = { antigravity: 0, gemini: 0, omp: 0 };


/** ACP 聊天全局 store */
export const useAcpChatStore = create<AcpChatStore>((set, get) => ({
  providers: [],
  activeProvider: loadActiveProvider(),
  chats: createInitialChats(),

  init: async () => {
    if (!unsubscribeEvents) {
      unsubscribeEvents = window.api.onAcpEvent((event) => {
        set((state) => ({ chats: applyAcpEvent(state.chats, event) }));
      });
    }
    await get().refreshProviders();
  },

  refreshProviders: async () => {
    try {
      set({ providers: await window.api.acpProviders() });
    } catch {
      set({ providers: [] });
    }
  },

  selectProvider: (providerId) => {
    const previous = get().activeProvider;
    if (previous !== providerId) {
      void window.api.acpStop(previous);
    }
    try {
      localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
    } catch {
      // 持久化失败不影响本次会话内的切换
    }
    set({ activeProvider: providerId });
  },

  send: async (text, images) => {
    const providerId = get().activeProvider;
    if (get().chats[providerId].busy) return;
    set((state) => ({ chats: patchChat(state.chats, providerId, (chat) => beginTurn(chat, text, images)) }));
    const epoch = turnEpoch[providerId];
    let error: string | undefined;
    try {
      const result = await window.api.acpPrompt(providerId, text, images);
      if (!result.ok) error = result.error ?? 'Request failed';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    if (epoch !== turnEpoch[providerId]) return;
    set((state) => ({ chats: patchChat(state.chats, providerId, (chat) => endTurn(chat, error)) }));
  },

  stop: () => {
    void window.api.acpCancel(get().activeProvider);
  },

  newChat: async () => {
    const providerId = get().activeProvider;
    turnEpoch[providerId] += 1;
    set((state) => ({ chats: patchChat(state.chats, providerId, (chat) => ({ ...createEmptyChat(), status: chat.status })) }));
    await window.api.acpReset(providerId);
  },

  resolvePermission: (optionId) => {
    const chat = get().chats[get().activeProvider];
    const request = chat.permissions[0];
    if (!request) return;
    set((state) => ({
      chats: patchChat(state.chats, request.providerId, (current) => ({
        ...current,
        permissions: current.permissions.filter((item) => item.requestId !== request.requestId),
      })),
    }));
    void window.api.acpPermissionResolve(request.requestId, optionId);
  },
}));
