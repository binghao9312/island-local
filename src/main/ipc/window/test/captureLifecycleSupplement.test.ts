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
 * @file captureLifecycleSupplement.test.ts
 * @description 截图保存失败及发送窗口销毁时的取消与监听清理测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCaptureIpcHandlers } from '../capture';
import type { BrowserWindow } from 'electron';
type HandlerFixture = (...args: unknown[]) => unknown;
interface SenderFixture extends EventEmitter { id: number; }
interface ImageFixture { toPNG: () => Buffer; }
const io = vi.hoisted(() => ({
  handles: new Map<string, HandlerFixture>(), events: new Map<string, HandlerFixture>(),
  write: vi.fn(), clipboard: vi.fn(), screenshot: vi.fn<(signal?: AbortSignal) => Buffer | null | Promise<Buffer | null>>(),
  sources: vi.fn<() => Promise<{ thumbnail: ImageFixture }[]>>(),
  image: vi.fn<(url: string) => ImageFixture>(),
  save: vi.fn<() => Promise<{ canceled: boolean; filePath?: string }>>(),
}));
vi.mock('electron', () => ({
  app: { getPath: () => 'C:/fixture-pictures' }, clipboard: { write: io.clipboard },
  ClipboardItem: class {
    /**
     * 保存异步复制测试的截图载荷。
     * @param data - 按 MIME 类型索引的截图载荷。
     */
    constructor(readonly data: Record<string, Blob>) {}
  },
  desktopCapturer: { getSources: io.sources }, dialog: { showSaveDialog: io.save },
  nativeImage: { createFromDataURL: io.image },
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handles.set(channel, handler), on: (channel: string, handler: HandlerFixture) => io.events.set(channel, handler) },
}));
vi.mock('fs/promises', () => ({ writeFile: io.write }));
vi.mock('../../../window/screenshotHelper', () => ({ capturePrimaryDisplayPng: io.screenshot, encodeScreenshotPng: async (image: ImageFixture) => image.toPNG() }));
const win = { isDestroyed: vi.fn<() => boolean>(), hide: vi.fn(), webContents: { id: 7 } };
let currentWindow: BrowserWindow | null;
const close = vi.fn();
const start = vi.fn<() => Promise<void>>();
/**
 * 调用真实截图处理器，允许畸形 IPC 参数进入校验路径。
 * @param channel - 截图通道
 * @param payload - 请求载荷
 * @param sender - 请求来源窗口
 * @returns 真实处理器结果
 */
function invoke(channel: string, payload?: unknown, sender: SenderFixture = Object.assign(new EventEmitter(), { id: 7 })): unknown {
  return io.handles.get(channel)?.({ sender }, payload);
}
beforeEach(() => {
  vi.resetAllMocks(); io.handles.clear(); io.events.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  win.isDestroyed.mockReturnValue(false);
  currentWindow = win as unknown as BrowserWindow;
  start.mockResolvedValue(undefined); io.screenshot.mockReturnValue(null); io.sources.mockResolvedValue([]);
  io.image.mockReturnValue({ toPNG: () => Buffer.from('png') }); io.save.mockResolvedValue({ canceled: true });
  registerCaptureIpcHandlers({ getCaptureWindow: () => currentWindow, closeCaptureWindow: close, startRegionScreenshot: start });
});
afterEach(() => vi.restoreAllMocks());
describe('截图图像来源及保存清理', () => {
  it('原生屏幕截图优先于 desktopCapturer', async () => {
    io.screenshot.mockReturnValue(Buffer.from('native'));
    await expect(invoke('system:screenshot')).resolves.toEqual(Buffer.from('native'));
    expect(io.sources).not.toHaveBeenCalled();
  });
  it('无屏幕来源时返回 null', async () => { await expect(invoke('system:screenshot')).resolves.toBeNull(); });
  it('屏幕捕获失败返回 null 并记录错误', async () => {
    io.sources.mockRejectedValue(new Error('capture failed'));
    await expect(invoke('system:screenshot')).resolves.toBeNull(); expect(console.error).toHaveBeenCalled();
  });
  it('剪贴板失败仍关闭截图窗口', async () => {
    io.clipboard.mockRejectedValue(new Error('clipboard failed'));
    await io.events.get('capture-complete')?.({}, { dataURL: 'data:image/png;base64,AA==' });
    expect(close).toHaveBeenCalledOnce(); expect(console.error).toHaveBeenCalled();
  });
  it('剪贴板写入完成后才关闭截图窗口', async () => {
    let finishWrite: () => void = () => {};
    io.clipboard.mockImplementationOnce(() => new Promise<void>((resolve) => { finishWrite = resolve; }));
    io.events.get('capture-complete')?.({}, { dataURL: 'data:image/png;base64,AA==' });
    expect(close).not.toHaveBeenCalled();
    finishWrite();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it.each(['canceled', 'no-path', 'failure', 'absent-window', 'destroyed-window'])('%s 保存边界仍关闭窗口', async (scenario) => {
    if (scenario === 'no-path') io.save.mockResolvedValue({ canceled: false });
    if (scenario === 'failure') io.save.mockRejectedValue(new Error('dialog failed'));
    if (scenario === 'absent-window') currentWindow = null;
    if (scenario === 'destroyed-window') win.isDestroyed.mockReturnValue(true);
    await io.events.get('capture-save')?.({}, { dataURL: 'data:image/png;base64,AA==' });
    expect(io.write).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
    if (scenario === 'absent-window' || scenario === 'destroyed-window') expect(win.hide).not.toHaveBeenCalled();
    if (scenario === 'failure') expect(console.error).toHaveBeenCalled();
  });
});
it('主屏截图单飞，窗口销毁中止 native 请求并清理监听', async () => {
  let resolveCapture!: (value: Buffer | null) => void;
  io.screenshot.mockReturnValue(new Promise((resolve) => { resolveCapture = resolve; }));
  const sender = Object.assign(new EventEmitter(), { id: 7 });
  const pending = invoke('system:screenshot', undefined, sender);
  await expect(invoke('system:screenshot')).resolves.toBeNull();
  expect(io.screenshot).toHaveBeenCalledOnce();
  sender.emit('destroyed');
  expect(io.screenshot.mock.calls[0][0]?.aborted).toBe(true);
  resolveCapture(null);
  await expect(pending).resolves.toBeNull();
  expect(sender.listenerCount('destroyed')).toBe(0);
  expect(io.sources).not.toHaveBeenCalled();
});
