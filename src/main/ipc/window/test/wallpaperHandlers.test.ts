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
 * @file wallpaperHandlers.test.ts
 * @description wallpaper IPC handlers 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock, onMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  onMock: vi.fn(),
}));

const {
  appGetPathMock,
  showOpenDialogMock,
  createThumbnailFromPathMock,
  browserWindowFromWebContentsMock,
  browserWindowGetFocusedWindowMock,
  netFetchMock,
} = vi.hoisted(() => ({
  appGetPathMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  createThumbnailFromPathMock: vi.fn(),
  browserWindowFromWebContentsMock: vi.fn(),
  browserWindowGetFocusedWindowMock: vi.fn(),
  netFetchMock: vi.fn(),
}));

const {
  writeFileSyncMock,
  existsSyncMock,
  readFileSyncMock,
  readdirSyncMock,
  unlinkSyncMock,
  mkdirSyncMock,
  copyFileSyncMock,
} = vi.hoisted(() => ({
  writeFileSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  copyFileSyncMock: vi.fn(),
}));

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: appGetPathMock,
  },
  dialog: {
    showOpenDialog: showOpenDialogMock,
  },
  ipcMain: {
    handle: handleMock,
    on: onMock,
  },
  nativeImage: {
    createThumbnailFromPath: createThumbnailFromPathMock,
  },
  BrowserWindow: {
    fromWebContents: browserWindowFromWebContentsMock,
    getFocusedWindow: browserWindowGetFocusedWindowMock,
  },
  net: {
    fetch: netFetchMock,
  },
}));


vi.mock('fs', () => ({
  writeFileSync: writeFileSyncMock,
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  readdirSync: readdirSyncMock,
  unlinkSync: unlinkSyncMock,
  mkdirSync: mkdirSyncMock,
  copyFileSync: copyFileSyncMock,
}));


vi.mock('node:fs/promises', () => ({
  stat: async () => ({ isFile: () => true, size: 7 }),
  mkdir: async (...args: unknown[]) => mkdirSyncMock(...args),
  copyFile: async (...args: unknown[]) => copyFileSyncMock(...args),
  rename: async () => {},
  writeFile: async (path: string, data: Buffer) => writeFileSyncMock(path, data),
  readdir: async () => readdirSyncMock() ?? [],
  unlink: async (...args: unknown[]) => unlinkSyncMock(...args),
  open: async (path: string) => {
    const data = readFileSyncMock(path);
    return { stat: async () => ({ isFile: () => true, size: data.length }),
      read: async (bytes: Uint8Array) => { bytes.set(data); return { bytesRead: data.length }; }, close: async () => {} };
  },
}));
vi.mock('../../../media/localAssets', () => ({ createLocalAssetUrl: async (path: string) => {
  readFileSyncMock(path);
  return 'eisland-media://asset/fixture';
} }));
vi.mock('../../../media/downloadWallpaper', () => ({ default: async (url: string, destination: (response: Response) => string) => {
  const response = await netFetchMock(url);
  if (!response.ok) throw new Error('HTTP failure');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Empty response');
  const path = destination(response); writeFileSyncMock(path, bytes); return path;
} }));

vi.mock('child_process', () => ({
  execFile: execFileMock,
}));

import { registerWallpaperIpcHandlers } from '../wallpaper';

describe('wallpaper ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const onHandlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handleHandlers.clear();
    onHandlers.clear();

    handleMock.mockReset();
    onMock.mockReset();
    appGetPathMock.mockReset();
    showOpenDialogMock.mockReset();
    createThumbnailFromPathMock.mockReset();
    browserWindowFromWebContentsMock.mockReset();
    browserWindowGetFocusedWindowMock.mockReset();
    netFetchMock.mockReset();

    writeFileSyncMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    readdirSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    copyFileSyncMock.mockReset();

    execFileMock.mockReset();

    appGetPathMock.mockImplementation((name: string) => {
      if (name === 'pictures') return 'C:/Pictures';
      return 'C:/AppData/eIsland';
    });

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlers.set(channel, handler);
    });
  });

  it('handles wallpaper open/load/clear/read-buffer branches', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);
    const focusedWindow = { id: 1 };

    browserWindowFromWebContentsMock.mockReturnValue(null);
    browserWindowGetFocusedWindowMock.mockReturnValue(focusedWindow);

    showOpenDialogMock
      .mockResolvedValueOnce({
        canceled: false,
        filePaths: ['D:/wall/in.png'],
      })
      .mockResolvedValueOnce({
        canceled: false,
        filePaths: ['D:/wall/in.mp4'],
      });

    existsSyncMock.mockImplementation((p: string) => {
      if (p.includes('wallpapers')) return true;
      if (p === 'D:/wall/in.png') return true;
      if (p === 'C:/AppData/eIsland/wallpapers/custom-bg-abc.png') return true;
      return true;
    });
    readdirSyncMock.mockReturnValue(['custom-bg-abc.png', 'keep.txt']);
    readFileSyncMock.mockReturnValue(Buffer.from('img'));
    createThumbnailFromPathMock.mockResolvedValue({
      isEmpty: () => false,
      toJPEG: () => Buffer.from('thumb'),
    });

    registerWallpaperIpcHandlers();

    const openImage = handleHandlers.get('dialog:open-image');
    const openVideo = handleHandlers.get('dialog:open-video');
    const loadFile = handleHandlers.get('wallpaper:load-file');
    const loadThumbnail = handleHandlers.get('album:load-thumbnail');
    const clearCache = handleHandlers.get('wallpaper:clear-cache');
    const readBuffer = handleHandlers.get('wallpaper:read-file-buffer');

    const openImageResult = await openImage?.({ sender: {} });
    const openVideoResult = await openVideo?.({ sender: {} });

    expect(showOpenDialogMock).toHaveBeenCalledTimes(2);
    expect(openImageResult).toContain('custom-bg-12345.png');
    expect(openVideoResult).toContain('custom-bg-12345.mp4');
    expect(copyFileSyncMock).toHaveBeenCalled();
    expect(unlinkSyncMock).toHaveBeenCalledWith(expect.stringContaining('custom-bg-abc.png'));

    await expect(loadFile?.({}, 'D:/wall/in.png')).resolves.toBe('eisland-media://asset/fixture');
    await expect(loadThumbnail?.({}, 'D:/wall/in.png')).resolves.toBe(`data:image/jpeg;base64,${Buffer.from('thumb').toString('base64')}`);
    expect(createThumbnailFromPathMock).toHaveBeenCalledWith('D:/wall/in.png', { width: 320, height: 320 });
    await expect(readBuffer?.({}, 'C:/AppData/eIsland/wallpapers/test.png')).resolves.toEqual(new Uint8Array(Buffer.from('img')));

    await clearCache?.({});
    expect(unlinkSyncMock).toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('handles wallpaper system:set clear and sourcePath set', async () => {
    registerWallpaperIpcHandlers();

    const systemSet = handleHandlers.get('wallpaper:system:set');

    if (process.platform !== 'win32') {
      await expect(systemSet?.({}, { clear: true })).resolves.toBe(false);
      await expect(systemSet?.({}, { sourcePath: 'D:/wall/in.png' })).resolves.toBe(false);
      return;
    }

    existsSyncMock.mockImplementation((p: string) => {
      if (p.includes('wallpapers')) return true;
      if (p.includes('desktop-sync-wallpaper-black.bmp')) return true;
      if (p === 'D:/wall/in.png') return true;
      return false;
    });

    execFileMock.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (err: Error | null, stdout: string) => void) => {
        callback(null, 'True');
      },
    );

    await expect(systemSet?.({}, { clear: true })).resolves.toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalled();

    await expect(systemSet?.({}, { sourcePath: 'D:/wall/in.png' })).resolves.toBe(true);
    expect(execFileMock).toHaveBeenCalled();
  });
});
