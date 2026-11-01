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
 * @file useIslandStartupUpdateCheckDisabled.test.ts
 * @description 更新总开关关闭时，启动流程不发起任何更新请求的测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';

const leaves = vi.hoisted(() => ({
  token: vi.fn<() => string | null>(),
  source: vi.fn(),
}));
vi.mock('../../../utils/userAccount', () => ({ readLocalToken: leaves.token }));
vi.mock('../../../api/user/userAccountApi', () => ({ fetchUpdateSourceUrl: leaves.source }));
vi.mock('../../config/dynamicIslandConfig', async () => ({
  ...(await import('../../config/dynamicIslandUpdateSource')),
  ...(await import('../../config/dynamicIslandStorageKeys')),
}));
const { useIslandStartupUpdateCheck } = await import('../useIslandStartupUpdateCheck');

let startup: (() => void) | undefined;
const updaterCheck = vi.fn();
const storeRead = vi.fn();

beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  startup = undefined;
  storeRead.mockResolvedValue(undefined);
  leaves.token.mockReturnValue(null);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    api: {
      onUpdaterStartupAutoCheckRequest: (callback: () => void) => { startup = callback; return vi.fn(); },
      storeRead,
      updaterCheck,
    },
  }));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

/**
 * 挂载 Hook 并触发主进程的启动信号。
 */
async function triggerStartup(): Promise<void> {
  renderHook(useIslandStartupUpdateCheck, {
    language: 'zh-CN',
    startupAutoCheckHandledRef: { current: false },
  });
  flushHookEffects();
  startup?.();
  await settleHook();
}

describe('useIslandStartupUpdateCheck with UPDATES_ENABLED=false', () => {
  it('makes no updater, update-source or auto-prompt calls at startup', async () => {
    await triggerStartup();

    expect(updaterCheck).not.toHaveBeenCalled();
    expect(leaves.source).not.toHaveBeenCalled();
    expect(storeRead).not.toHaveBeenCalledWith('update-auto-prompt-enabled');
    expect(storeRead).not.toHaveBeenCalledWith('update-source');
  });
});
