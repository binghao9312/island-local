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
 * @file useSettingsStore.test.ts
 * @description 设置共享 Store 状态选择器回归。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
vi.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(selector: T): T => selector
}));
const store = vi.hoisted(() => ({
  fetchWeatherData: vi.fn(),
  setLogin: vi.fn(),
  setRegister: vi.fn(),
  setNotification: vi.fn()
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (value: typeof store) => unknown) => selector(store)
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
/**
 * 执行真实共享 Store Hook，执行目标创建的状态选择器。
 * @returns 真正选择出的状态与动作。
 */
function render() {
  return renderWithHooks(useSettingsStore);
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
});
describe('设置共享 Store 实际回调', () => {
  it('返回真实状态选择器选择的服务和账号动作', () => {
    const result = render();
    expect(result.fetchWeatherData).toBe(store.fetchWeatherData);
    expect(result.setLogin).toBe(store.setLogin);
    expect(result.setRegister).toBe(store.setRegister);
    expect(result.setNotification).toBe(store.setNotification);
  });
});
