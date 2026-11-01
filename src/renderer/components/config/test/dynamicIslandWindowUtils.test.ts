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
 * @file dynamicIslandWindowUtils.test.ts
 * @description 单元测试 - dynamicIslandWindowUtils.ts
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

const { getMousePositionMock, getMouseWindowStateMock, getWindowBoundsMock } = vi.hoisted(() => ({
  getMousePositionMock: vi.fn(),
  getMouseWindowStateMock: vi.fn(),
  getWindowBoundsMock: vi.fn(),
}));

// Store original window.api so we can restore after each test
const originalApi = (globalThis as Record<string, unknown>).window
  ? (globalThis as unknown as { window: { api?: unknown } }).window.api
  : undefined;

beforeEach(() => {
  getMousePositionMock.mockReset();
  getMouseWindowStateMock.mockReset();
  getWindowBoundsMock.mockReset();
  (globalThis as unknown as { window: Record<string, unknown> }).window = globalThis.window ?? {};
  (globalThis as unknown as { window: { api: Record<string, unknown> } }).window.api = {
    getMousePosition: getMousePositionMock,
    getMouseWindowState: getMouseWindowStateMock,
    getWindowBounds: getWindowBoundsMock,
  };
});

describe('isMouseInWindow', () => {
  let isMouseInWindow: () => Promise<boolean>;

  beforeEach(async () => {
    const mod = await import('../dynamicIslandWindowUtils');
    isMouseInWindow = mod.isMouseInWindow;
  });

  describe('combined mouse and window state API', () => {
    it('should use one IPC response when the combined API is available', async () => {
      getMouseWindowStateMock.mockResolvedValue({
        mousePosition: { x: 150, y: 150 },
        bounds: { x: 100, y: 100, width: 100, height: 100 },
      });

      expect(await isMouseInWindow()).toBe(true);
      expect(getMouseWindowStateMock).toHaveBeenCalledTimes(1);
      expect(getMousePositionMock).not.toHaveBeenCalled();
      expect(getWindowBoundsMock).not.toHaveBeenCalled();
    });

    it('should fall back to the separate APIs when the combined API returns null', async () => {
      getMouseWindowStateMock.mockResolvedValue(null);
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
      expect(getMousePositionMock).toHaveBeenCalledTimes(1);
      expect(getWindowBoundsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('mouse inside window', () => {
    it('should return true when mouse is at the center of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the top-left corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 100, y: 100 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the bottom-right corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 300, y: 300 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the top-right corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 300, y: 100 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when mouse is at the bottom-left corner of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 100, y: 300 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return true when window is at origin (0,0)', async () => {
      getMousePositionMock.mockResolvedValue({ x: 50, y: 50 });
      getWindowBoundsMock.mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });
  });

  describe('mouse outside window', () => {
    it('should return false when mouse is to the left of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 90, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is to the right of the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 301, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is above the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 99 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is below the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 301 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when mouse is far away from the window', async () => {
      getMousePositionMock.mockResolvedValue({ x: 9999, y: 9999 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('null / undefined API responses', () => {
    it('should return false when getMousePosition returns null', async () => {
      getMousePositionMock.mockResolvedValue(null);
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds returns null', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue(null);

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getMousePosition returns undefined', async () => {
      getMousePositionMock.mockResolvedValue(undefined);
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds returns undefined', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockResolvedValue(undefined);

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when both return null', async () => {
      getMousePositionMock.mockResolvedValue(null);
      getWindowBoundsMock.mockResolvedValue(null);

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('window.api is undefined', () => {
    it('should return false when window.api is undefined', async () => {
      (globalThis as unknown as { window: { api?: unknown } }).window.api = undefined;

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('API throws errors', () => {
    it('should return false when getMousePosition rejects', async () => {
      getMousePositionMock.mockRejectedValue(new Error('IPC failed'));
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when getWindowBounds rejects', async () => {
      getMousePositionMock.mockResolvedValue({ x: 150, y: 150 });
      getWindowBoundsMock.mockRejectedValue(new Error('IPC failed'));

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should return false when both APIs reject', async () => {
      getMousePositionMock.mockRejectedValue(new Error('getMousePosition failed'));
      getWindowBoundsMock.mockRejectedValue(new Error('getWindowBounds failed'));

      expect(await isMouseInWindow()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true for a zero-width window where mouse x equals bounds x', async () => {
      // width=0 means bounds.x + width = bounds.x, so x >= bounds.x && x <= bounds.x is true when x === bounds.x
      getMousePositionMock.mockResolvedValue({ x: 100, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 0, height: 100 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return false for a zero-width window where mouse x differs from bounds x', async () => {
      getMousePositionMock.mockResolvedValue({ x: 101, y: 150 });
      getWindowBoundsMock.mockResolvedValue({ x: 100, y: 100, width: 0, height: 100 });

      expect(await isMouseInWindow()).toBe(false);
    });

    it('should handle negative window coordinates', async () => {
      getMousePositionMock.mockResolvedValue({ x: -50, y: -50 });
      getWindowBoundsMock.mockResolvedValue({ x: -100, y: -100, width: 200, height: 200 });

      expect(await isMouseInWindow()).toBe(true);
    });

    it('should return false when mouse is at negative coordinates outside a positive window', async () => {
      getMousePositionMock.mockResolvedValue({ x: -1, y: 50 });
      getWindowBoundsMock.mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 });

      expect(await isMouseInWindow()).toBe(false);
    });
  });
});

describe('isPointInShellRect', () => {
  let isPointInShellRect: typeof import('../dynamicIslandWindowUtils').isPointInShellRect;

  beforeEach(async () => {
    isPointInShellRect = (await import('../dynamicIslandWindowUtils')).isPointInShellRect;
  });

  const shellRect = { left: 100, top: 0, width: 200, height: 42 };
  const windowBounds = { x: 50, y: 30, width: 500 };

  it('同缩放下按视口 CSS 坐标判断壳层边界（含边缘）', () => {
    const at = (x: number, y: number) => isPointInShellRect({ mousePosition: { x, y }, windowBounds: { ...windowBounds, width: 500 }, viewportWidth: 500, shellRect: { ...shellRect } });
    expect(at(50 + 100, 30 + 10)).toBe(true);
    expect(at(50 + 300, 30 + 41)).toBe(true);
    expect(at(50 + 99, 30 + 10)).toBe(false);
    expect(at(50 + 310, 30 + 10)).toBe(false);
    expect(at(50 + 150, 30 + 43)).toBe(false);
  });

  it('窗口 DIP 宽度为视口 CSS 宽度的倍数时先换算再判断', () => {
    expect(isPointInShellRect({
      mousePosition: { x: 50 + 300, y: 30 + 10 },
      windowBounds: { x: 50, y: 30, width: 1000 },
      viewportWidth: 500,
      shellRect,
    })).toBe(true);
  });

  it('视口或窗口宽度无效时视为未命中', () => {
    expect(isPointInShellRect({ mousePosition: { x: 150, y: 10 }, windowBounds, viewportWidth: 0, shellRect })).toBe(false);
    expect(isPointInShellRect({ mousePosition: { x: 150, y: 10 }, windowBounds: { ...windowBounds, width: 0 }, viewportWidth: 500, shellRect })).toBe(false);
  });
});

describe('isMouseInIslandShell', () => {
  let isMouseInIslandShell: () => Promise<boolean>;
  const shell = { getBoundingClientRect: () => ({ left: 100, top: 0, width: 200, height: 42 }) };

  beforeEach(async () => {
    isMouseInIslandShell = (await import('../dynamicIslandWindowUtils')).isMouseInIslandShell;
    getMouseWindowStateMock.mockReset();
    getMousePositionMock.mockReset();
    getWindowBoundsMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * 注册带或不带壳层元素的文档桩。
   * @param element - 壳层元素，null 表示页面中不存在壳层。
   */
  function stubDocument(element: unknown): void {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => (selector === '.island-shell' ? element : null),
      documentElement: { clientWidth: 500 },
    });
  }

  it('鼠标在壳层内为命中，壳层外但仍在 500px 窗口内为未命中', async () => {
    stubDocument(shell);
    getMouseWindowStateMock.mockResolvedValue({ mousePosition: { x: 50 + 150, y: 30 + 10 }, bounds: { x: 50, y: 30, width: 500, height: 42 } });
    expect(await isMouseInIslandShell()).toBe(true);
    getMouseWindowStateMock.mockResolvedValue({ mousePosition: { x: 50 + 400, y: 30 + 10 }, bounds: { x: 50, y: 30, width: 500, height: 42 } });
    expect(await isMouseInIslandShell()).toBe(false);
  });

  it('页面没有壳层元素时回退为窗口范围判断', async () => {
    stubDocument(null);
    getMouseWindowStateMock.mockResolvedValue({ mousePosition: { x: 400, y: 10 }, bounds: { x: 0, y: 0, width: 500, height: 42 } });
    expect(await isMouseInIslandShell()).toBe(true);
  });

  it('无法获取合并鼠标状态时回退为分离接口的窗口范围判断', async () => {
    stubDocument(shell);
    getMouseWindowStateMock.mockResolvedValue(null);
    getMousePositionMock.mockResolvedValue({ x: 400, y: 10 });
    getWindowBoundsMock.mockResolvedValue({ x: 0, y: 0, width: 500, height: 42 });
    expect(await isMouseInIslandShell()).toBe(true);
  });

  it('读取鼠标状态失败时视为未命中', async () => {
    stubDocument(shell);
    getMouseWindowStateMock.mockRejectedValue(new Error('ipc failed'));
    expect(await isMouseInIslandShell()).toBe(false);
  });
});
