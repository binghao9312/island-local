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
 * @file updaterDisabled.test.ts
 * @description 更新总开关关闭时，更新 IPC 不触达 electron-updater 与网络的测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUpdaterIpcHandlers } from '../updater';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  netFetch: vi.fn(),
  netRequest: vi.fn(),
  setFeedURL: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
  net: { fetch: mocks.netFetch, request: mocks.netRequest },
}));
vi.mock('../../../config/storeConfig', () => ({ deleteFirstLaunchConfig: vi.fn() }));

const handlers = new Map<string, (...args: unknown[]) => unknown>();

/**
 * 断言没有任何更新器或网络调用发生。
 */
function expectNoUpdateTraffic(): void {
  expect(mocks.setFeedURL).not.toHaveBeenCalled();
  expect(mocks.checkForUpdates).not.toHaveBeenCalled();
  expect(mocks.downloadUpdate).not.toHaveBeenCalled();
  expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  expect(mocks.netFetch).not.toHaveBeenCalled();
  expect(mocks.netRequest).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  mocks.handle.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => { handlers.set(channel, handler); });
  registerUpdaterIpcHandlers({
    updater: {
      setFeedURL: mocks.setFeedURL,
      checkForUpdates: mocks.checkForUpdates,
      downloadUpdate: mocks.downloadUpdate,
      quitAndInstall: mocks.quitAndInstall,
    } as unknown as Parameters<typeof registerUpdaterIpcHandlers>[0]['updater'],
    getVersion: () => '1.0.0',
    isPackaged: () => true,
  });
});

describe('updater IPC with UPDATES_ENABLED=false', () => {
  it('returns a disabled check result without an error or any update traffic', async () => {
    const result = await handlers.get('updater:check')!({}, 'github');
    expect(result).toEqual({ available: false, disabled: true });
    expectNoUpdateTraffic();
  });

  it('refuses download and install without touching the updater', async () => {
    await expect(handlers.get('updater:download')!({}, 'cloudflare-r2')).resolves.toBe(false);
    expect(handlers.get('updater:install')!()).toBe(false);
    expectNoUpdateTraffic();
  });

  it('still reports the local app version', () => {
    expect(handlers.get('updater:version')!()).toBe('1.0.0');
  });
});
