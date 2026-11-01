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
 * @file acpChatState.ts
 * @description ACP 聊天状态的纯函数：把主进程事件、用户输入与错误归并进各供应商的会话状态
 * @author 鸡哥
 */

import type {
  AcpChatItem,
  AcpConnectionStatus,
  AcpEvent,
  AcpImageData,
  AcpPermissionRequest,
  AcpProviderId,
} from '../../../../../../../shared/acpTypes';
import { nextId, reduceAcpUpdate } from '../../../../../../../shared/acpReducer';

/** 单个供应商的聊天状态 */
export interface AcpProviderChat {
  /** 对话条目 */
  items: AcpChatItem[];
  /** 与智能体进程的连接状态 */
  status: AcpConnectionStatus;
  /** 状态附带的信息（错误原因或安装提示） */
  statusMessage: string;
  /** 一轮提问进行中 */
  busy: boolean;
  /** 等待用户处理的权限请求队列，队首正在展示 */
  permissions: AcpPermissionRequest[];
}

/** 全部供应商的聊天状态 */
export type AcpChats = Record<AcpProviderId, AcpProviderChat>;

/**
 * 创建空会话状态
 * @returns 初始会话状态
 */
export function createEmptyChat(): AcpProviderChat {
  return { items: [], status: 'idle', statusMessage: '', busy: false, permissions: [] };
}

/**
 * 创建全部供应商的初始状态
 * @returns 初始状态表
 */
export function createInitialChats(): AcpChats {
  return { antigravity: createEmptyChat(), gemini: createEmptyChat(), omp: createEmptyChat() };
}

/**
 * 更新某个供应商的状态，其余保持不变
 * @param chats - 当前状态表
 * @param providerId - 目标供应商
 * @param patch - 生成新状态的函数
 * @returns 新的状态表
 */
export function patchChat(
  chats: AcpChats,
  providerId: AcpProviderId,
  patch: (chat: AcpProviderChat) => AcpProviderChat,
): AcpChats {
  return { ...chats, [providerId]: patch(chats[providerId]) };
}

/**
 * 应用主进程推送的事件
 * @description 进程退出或出错时清空权限队列，因为对应请求已随进程失效
 * @param chats - 当前状态表
 * @param event - ACP 事件
 * @returns 新的状态表
 */
export function applyAcpEvent(chats: AcpChats, event: AcpEvent): AcpChats {
  if (event.type === 'update') {
    return patchChat(chats, event.providerId, (chat) => ({ ...chat, items: reduceAcpUpdate(chat.items, event.update) }));
  }
  if (event.type === 'permission') {
    return patchChat(chats, event.request.providerId, (chat) => ({
      ...chat,
      permissions: [...chat.permissions, event.request],
    }));
  }
  if (event.type === 'permission-cancelled') {
    return patchChat(chats, event.providerId, (chat) => ({
      ...chat,
      permissions: chat.permissions.filter((request) => request.requestId !== event.requestId),
    }));
  }
  const dead = event.status === 'exited' || event.status === 'error' || event.status === 'idle';
  return patchChat(chats, event.providerId, (chat) => ({
    ...chat,
    status: event.status,
    statusMessage: event.message ?? '',
    permissions: dead ? [] : chat.permissions,
  }));
}

/**
 * 追加用户消息并进入提问进行中状态
 * @param chat - 当前会话
 * @param text - 用户文字
 * @param images - 用户附带的图片
 * @returns 新的会话
 */
export function beginTurn(chat: AcpProviderChat, text: string, images: AcpImageData[]): AcpProviderChat {
  return {
    ...chat,
    busy: true,
    items: [...chat.items, { kind: 'user', id: nextId(chat.items), text, images }],
  };
}

/**
 * 结束一轮提问；失败时追加错误条目
 * @param chat - 当前会话
 * @param error - 失败原因，成功时为 undefined
 * @returns 新的会话
 */
export function endTurn(chat: AcpProviderChat, error?: string): AcpProviderChat {
  const items: AcpChatItem[] = error
    ? [...chat.items, { kind: 'error', id: nextId(chat.items), text: error }]
    : chat.items;
  return { ...chat, busy: false, items };
}
