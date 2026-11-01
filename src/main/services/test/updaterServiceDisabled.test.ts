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
 * @file updaterServiceDisabled.test.ts
 * @description 更新总开关关闭时，启动阶段不触发任何更新检查的测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initUpdaterService } from '../updaterService';

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  on: vi.fn(),
  netFetch: vi.fn(),
  netRequest: vi.fn(),
  getAllWindows: vi.fn(() => []),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, on: mocks.on },
  BrowserWindow: { getAllWindows: mocks.getAllWindows },
  net: { fetch: mocks.netFetch, request: mocks.netRequest },
}));

class UpdaterFixture extends EventEmitter {
  autoDownload = true;

  autoInstallOnAppQuit = true;

  allowPrerelease = true;

  forceDevUpdateConfig = false;

  logger: unknown = null;

  setFeedURL = vi.fn();

  checkForUpdates = vi.fn();

  downloadUpdate = vi.fn();
}

const send = vi.fn();
const win = { isDestroyed: () => false, webContents: { send } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('initUpdaterService with UPDATES_ENABLED=false', () => {
  it('never calls the updater or the network, ignores the auto-prompt setting and stays idle for a day', () => {
    const updater = new UpdaterFixture();
    const shouldAutoPromptUpdate = vi.fn(() => true);
    initUpdaterService({
      updater: updater as unknown as Parameters<typeof initUpdaterService>[0]['updater'],
      getMainWindow: () => win as unknown as ReturnType<Parameters<typeof initUpdaterService>[0]['getMainWindow']>,
      getAppPath: () => '/app',
      isPackaged: () => true,
      shouldAutoPromptUpdate,
      autoCheckDelayMs: 100,
    });
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(updater.checkForUpdates).not.toHaveBeenCalled();
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    expect(updater.setFeedURL).not.toHaveBeenCalled();
    expect(mocks.netFetch).not.toHaveBeenCalled();
    expect(mocks.netRequest).not.toHaveBeenCalled();
    expect(shouldAutoPromptUpdate).not.toHaveBeenCalled();
  });

  it('still signals the renderer startup flow once so the weather alert pre-check can run', () => {
    initUpdaterService({
      updater: new UpdaterFixture() as unknown as Parameters<typeof initUpdaterService>[0]['updater'],
      getMainWindow: () => win as unknown as ReturnType<Parameters<typeof initUpdaterService>[0]['getMainWindow']>,
      getAppPath: () => '/app',
      isPackaged: () => true,
      autoCheckDelayMs: 100,
    });
    vi.advanceTimersByTime(100);

    expect(send).toHaveBeenCalledExactlyOnceWith('updater:startup-auto-check-request', { requestedAt: expect.any(Number) });
  });
});
