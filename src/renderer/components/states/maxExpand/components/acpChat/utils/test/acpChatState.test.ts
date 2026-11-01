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
 * @file acpChatState.test.ts
 * @description ACP 聊天状态纯函数测试：事件归并、权限队列与提问轮次
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type { AcpPermissionRequest } from '../../../../../../../../shared/acpTypes';
import { applyAcpEvent, beginTurn, createInitialChats, endTurn } from '../acpChatState';

const request = (requestId: string): AcpPermissionRequest => ({
  requestId,
  providerId: 'omp',
  title: 'echo hi',
  options: [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }],
});

describe('applyAcpEvent', () => {
  it('routes updates to the provider that produced them', () => {
    const chats = applyAcpEvent(createInitialChats(), {
      type: 'update',
      providerId: 'gemini',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } },
    });
    expect(chats.gemini.items).toHaveLength(1);
    expect(chats.omp.items).toHaveLength(0);
  });

  it('queues permission requests in arrival order and removes cancelled ones', () => {
    let chats = applyAcpEvent(createInitialChats(), { type: 'permission', request: request('a') });
    chats = applyAcpEvent(chats, { type: 'permission', request: request('b') });
    expect(chats.omp.permissions.map((item) => item.requestId)).toEqual(['a', 'b']);
    chats = applyAcpEvent(chats, { type: 'permission-cancelled', providerId: 'omp', requestId: 'a' });
    expect(chats.omp.permissions.map((item) => item.requestId)).toEqual(['b']);
  });

  it('records status and clears pending permissions when the process dies', () => {
    let chats = applyAcpEvent(createInitialChats(), { type: 'permission', request: request('a') });
    chats = applyAcpEvent(chats, { type: 'status', providerId: 'omp', status: 'starting' });
    expect(chats.omp.permissions).toHaveLength(1);
    chats = applyAcpEvent(chats, { type: 'status', providerId: 'omp', status: 'exited', message: 'Process exited (1)' });
    expect(chats.omp).toMatchObject({ status: 'exited', statusMessage: 'Process exited (1)', permissions: [] });
  });
});

describe('turn helpers', () => {
  it('begins a turn with a user item and ends it with an optional error item', () => {
    const started = beginTurn(createInitialChats().omp, 'hello', [{ data: 'AAAA', mimeType: 'image/png' }]);
    expect(started.busy).toBe(true);
    expect(started.items[0]).toMatchObject({ kind: 'user', text: 'hello', images: [{ mimeType: 'image/png' }] });
    expect(endTurn(started).busy).toBe(false);
    const failed = endTurn(started, 'boom');
    expect(failed.items.at(-1)).toMatchObject({ kind: 'error', text: 'boom' });
    expect(new Set(failed.items.map((item) => item.id)).size).toBe(failed.items.length);
  });
});
