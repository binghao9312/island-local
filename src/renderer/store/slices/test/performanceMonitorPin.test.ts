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
 * @file performanceMonitorPin.test.ts
 * @description 性能监控固定状态：切换、阻止自动收起、离开页面自动取消固定的 Store 测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createIslandSlice } from '../islandSlice';
import { isPerformanceMonitorPinActive } from '../islandSlice';
import type { IslandSlice } from '../../types';

const api = {
  collapseWindow: vi.fn<(delay: number) => void>(),
  expandWindow: vi.fn<(delay: number) => void>(),
  expandWindowFull: vi.fn<(delay: number) => void>(),
  enableMousePassthrough: vi.fn<() => void>(),
  disableMousePassthrough: vi.fn<() => void>(),
};

/**
 * 创建位于展开态性能监控页的真实 Store。
 * @returns Zustand 状态 API
 */
function pinnableStore() {
  const store = createStore<IslandSlice>()(createIslandSlice);
  store.getState().setExpandTab('performanceMonitor');
  store.getState().setExpanded();
  return store;
}

describe('性能监控固定', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { api, location: { pathname: '/index.html' }, localStorage: { getItem: () => null, setItem: vi.fn() } });
    Object.values(api).forEach((fn) => fn.mockClear());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('默认未固定，切换可固定与取消固定', () => {
    const store = pinnableStore();
    expect(store.getState().performanceMonitorPinned).toBe(false);
    store.getState().setPerformanceMonitorPinned(true);
    expect(store.getState().performanceMonitorPinned).toBe(true);
    expect(isPerformanceMonitorPinActive(store.getState())).toBe(true);
    store.getState().setPerformanceMonitorPinned(false);
    expect(store.getState().performanceMonitorPinned).toBe(false);
  });

  it('不在展开态性能监控页时拒绝固定', () => {
    const store = createStore<IslandSlice>()(createIslandSlice);
    store.getState().setPerformanceMonitorPinned(true);
    expect(store.getState().performanceMonitorPinned).toBe(false);
    store.getState().setExpanded();
    store.getState().setPerformanceMonitorPinned(true);
    expect(store.getState().performanceMonitorPinned).toBe(false);
  });

  it('固定时 setIdle（含 force）不收起窗口', () => {
    const store = pinnableStore();
    store.getState().setPerformanceMonitorPinned(true);
    api.collapseWindow.mockClear();
    store.getState().setIdle(true);
    store.getState().setIdle();
    expect(store.getState().state).toBe('expanded');
    expect(api.collapseWindow).not.toHaveBeenCalled();
  });

  it('取消固定后 setIdle(true) 立即恢复收起', () => {
    const store = pinnableStore();
    store.getState().setPerformanceMonitorPinned(true);
    store.getState().setPerformanceMonitorPinned(false);
    store.getState().setIdle(true);
    expect(store.getState().state).toBe('idle');
    expect(api.collapseWindow).toHaveBeenCalledOnce();
  });

  it('切换到其它标签自动取消固定', () => {
    const store = pinnableStore();
    store.getState().setPerformanceMonitorPinned(true);
    store.getState().setExpandTab('song');
    expect(store.getState().performanceMonitorPinned).toBe(false);
    store.getState().setExpandTab('performanceMonitor');
    expect(store.getState().performanceMonitorPinned).toBe(false);
  });

  it('用户导航到其它状态自动取消固定', () => {
    const store = pinnableStore();
    store.getState().setPerformanceMonitorPinned(true);
    store.getState().setHover();
    expect(store.getState().performanceMonitorPinned).toBe(false);
    store.getState().setExpanded();
    expect(isPerformanceMonitorPinActive(store.getState())).toBe(false);
  });
});
