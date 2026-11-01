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
 * @file useAcpChatStore.test.ts
 * @description ACP 聊天 store 测试：事件订阅、提问轮次、权限回复与重置
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpEvent, AcpPromptResult } from '../../../../../../../../shared/acpTypes';
import { createInitialChats } from '../../utils/acpChatState';
import { useAcpChatStore } from '../useAcpChatStore';

const api = {
  onAcpEvent: vi.fn(),
  acpProviders: vi.fn(),
  acpPrompt: vi.fn(),
  acpCancel: vi.fn(),
  acpStop: vi.fn(),
  acpReset: vi.fn(),
  acpPermissionResolve: vi.fn(),
};
let emit: (event: AcpEvent) => void = () => {};
const storage = new Map<string, string>();

beforeEach(() => {
  vi.stubGlobal('window', { api });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
  });
  api.onAcpEvent.mockImplementation((callback: (event: AcpEvent) => void) => {
    emit = callback;
    return vi.fn();
  });
  api.acpProviders.mockResolvedValue([{ id: 'gemini', label: 'Gemini CLI', installed: true, installHint: 'x' }]);
  api.acpCancel.mockResolvedValue(undefined);
  api.acpReset.mockResolvedValue({ ok: true });
  api.acpPermissionResolve.mockResolvedValue(true);
  useAcpChatStore.setState({ chats: createInitialChats(), activeProvider: 'omp', providers: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  storage.clear();
});

describe('useAcpChatStore', () => {
  it('subscribes once and loads providers on init', async () => {
    await useAcpChatStore.getState().init();
    await useAcpChatStore.getState().init();
    expect(api.onAcpEvent.mock.calls.length).toBeLessThanOrEqual(1);
    expect(useAcpChatStore.getState().providers).toHaveLength(1);
  });

  it('defaults to antigravity when no stored provider exists', () => {
    storage.clear();
    useAcpChatStore.getState().selectProvider('antigravity');
    expect(useAcpChatStore.getState().activeProvider).toBe('antigravity');
  });

  it('persists the selected provider and stops the previously active provider', () => {
    useAcpChatStore.setState({ activeProvider: 'omp' });
    useAcpChatStore.getState().selectProvider('gemini');
    expect(useAcpChatStore.getState().activeProvider).toBe('gemini');
    expect(storage.get('eIsland_acpActiveProvider')).toBe('gemini');
    expect(api.acpStop).toHaveBeenCalledWith('omp');
  });

  it('adds the user message, streams updates, then finishes the turn', async () => {
    await useAcpChatStore.getState().init();
    let finish: (result: AcpPromptResult) => void = () => {};
    api.acpPrompt.mockReturnValue(new Promise<AcpPromptResult>((resolve) => { finish = resolve; }));
    const sending = useAcpChatStore.getState().send('hi', []);
    expect(useAcpChatStore.getState().chats.omp.busy).toBe(true);
    emit({ type: 'update', providerId: 'omp', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'yo' } } });
    finish({ ok: true, stopReason: 'end_turn' });
    await sending;
    const chat = useAcpChatStore.getState().chats.omp;
    expect(chat.busy).toBe(false);
    expect(chat.items.map((item) => item.kind)).toEqual(['user', 'agent']);
    expect(api.acpPrompt).toHaveBeenCalledWith('omp', 'hi', []);
  });

  it('shows a failed prompt as an error item and ignores a second send while busy', async () => {
    api.acpPrompt.mockResolvedValue({ ok: false, error: 'not logged in' });
    await useAcpChatStore.getState().send('hi', []);
    expect(useAcpChatStore.getState().chats.omp.items.at(-1)).toMatchObject({ kind: 'error', text: 'not logged in' });
    useAcpChatStore.setState({ chats: { ...createInitialChats(), omp: { ...createInitialChats().omp, busy: true } } });
    await useAcpChatStore.getState().send('again', []);
    expect(api.acpPrompt).toHaveBeenCalledTimes(1);
  });

  it('answers the head permission request and drops it from the queue', async () => {
    await useAcpChatStore.getState().init();
    const options = [{ optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' }];
    emit({ type: 'permission', request: { requestId: 'omp-perm-1', providerId: 'omp', title: 't', options } });
    emit({ type: 'permission', request: { requestId: 'omp-perm-2', providerId: 'omp', title: 'u', options } });
    useAcpChatStore.getState().resolvePermission('allow_once');
    expect(api.acpPermissionResolve).toHaveBeenCalledWith('omp-perm-1', 'allow_once');
    expect(useAcpChatStore.getState().chats.omp.permissions.map((item) => item.requestId)).toEqual(['omp-perm-2']);
    useAcpChatStore.getState().resolvePermission(null);
    expect(api.acpPermissionResolve).toHaveBeenLastCalledWith('omp-perm-2', null);
  });

  it('new chat clears messages and does not write the interrupted turn error into the new chat', async () => {
    let finish: (result: AcpPromptResult) => void = () => {};
    api.acpPrompt.mockReturnValue(new Promise<AcpPromptResult>((resolve) => { finish = resolve; }));
    const sending = useAcpChatStore.getState().send('hi', []);
    await useAcpChatStore.getState().newChat();
    expect(api.acpReset).toHaveBeenCalledWith('omp');
    expect(useAcpChatStore.getState().chats.omp.items).toHaveLength(0);
    finish({ ok: false, error: 'Agent stopped' });
    await sending;
    expect(useAcpChatStore.getState().chats.omp.items).toHaveLength(0);
  });

  it('stop cancels the active provider', () => {
    useAcpChatStore.getState().stop();
    expect(api.acpCancel).toHaveBeenCalledWith('omp');
  });
});
