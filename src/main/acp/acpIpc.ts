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
 * @file acpIpc.ts
 * @description ACP 聊天的 IPC 通道注册：供应商列表、会话启动/重置、提问、取消与权限回复
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import type { AcpImageData, AcpProviderId, AcpPromptResult, AcpStartResult } from '../../shared/acpTypes';
import type { AcpManager } from './acpManager';
import { ACP_PROVIDER_SPECS } from './providers';

/** 单次提问允许携带的最大图片数 */
const MAX_PROMPT_IMAGES = 8;

/**
 * 校验渲染进程传来的供应商标识
 * @param value - 未经校验的值
 * @returns 合法的供应商标识，否则 null
 */
function parseProviderId(value: unknown): AcpProviderId | null {
  return typeof value === 'string' && value in ACP_PROVIDER_SPECS ? (value as AcpProviderId) : null;
}

/**
 * 校验并清洗图片列表，丢弃字段缺失的项
 * @param value - 未经校验的值
 * @returns 合法的图片列表
 */
function parseImages(value: unknown): AcpImageData[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is AcpImageData => (
      typeof item?.data === 'string' && typeof item?.mimeType === 'string' && item.mimeType.startsWith('image/')
    ))
    .slice(0, MAX_PROMPT_IMAGES);
}

/**
 * 注册 ACP 相关 IPC 处理器
 * @param manager - ACP 客户端管理器
 */
export function registerAcpIpcHandlers(manager: AcpManager): void {
  const invalidProvider = { ok: false, error: 'Unknown provider' };

  ipcMain.handle('acp:providers', () => manager.listProviders());
  ipcMain.handle('acp:start', (_event, providerId: unknown): Promise<AcpStartResult> | AcpStartResult => {
    const id = parseProviderId(providerId);
    return id ? manager.start(id) : invalidProvider;
  });
  ipcMain.handle('acp:reset', (_event, providerId: unknown): Promise<AcpStartResult> | AcpStartResult => {
    const id = parseProviderId(providerId);
    return id ? manager.reset(id) : invalidProvider;
  });
  ipcMain.handle('acp:prompt', (
    _event,
    providerId: unknown,
    text: unknown,
    images: unknown,
  ): Promise<AcpPromptResult> | AcpPromptResult => {
    const id = parseProviderId(providerId);
    if (!id) return invalidProvider;
    return manager.prompt(id, typeof text === 'string' ? text : '', parseImages(images));
  });
  ipcMain.handle('acp:cancel', (_event, providerId: unknown): void => {
    const id = parseProviderId(providerId);
    if (id) manager.cancel(id);
  });
  ipcMain.handle('acp:stop', (_event, providerId: unknown): void => {
    const id = parseProviderId(providerId);
    if (id) manager.stop(id);
  });
  ipcMain.handle('acp:permission:resolve', (_event, requestId: unknown, optionId: unknown): boolean => {
    if (typeof requestId !== 'string') return false;
    return manager.resolvePermission(requestId, typeof optionId === 'string' ? optionId : null);
  });
}
