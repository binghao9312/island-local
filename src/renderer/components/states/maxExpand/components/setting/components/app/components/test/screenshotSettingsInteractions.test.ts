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
 * @file screenshotSettingsInteractions.test.ts
 * @description 截图引擎真实配置生命周期、提交与清理回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenshotSettingsPage } from '../ScreenshotSettingsPage';
import { elementProps, elements, invoke } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
/**
 * 执行实际截图设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => ScreenshotSettingsPage());
}
/**
 * 等待真实持久化读取队列。
 * @returns 当前服务回调完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实配置读取和提交', () => {
  it.each(['js', 'damaged'])('配置%s使用合法值或默认', async (engine) => {
    api.storeRead.mockImplementation((key) => Promise.resolve(key === 'screenshot-engine' ? engine : undefined));
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual(engine === 'js' ? [false, true] : [true, false]);
  });
  it('读取拒绝保留默认且不触发写入', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual([true, false]);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('卸载后延迟读取均取消状态更新', async () => {
    const pending = new Map<string, (value: unknown) => void>();
    api.storeRead.mockImplementation((key) => new Promise((resolve) => {
      pending.set(key, resolve);
    }));
    render();
    runEffects();
    unmountHooks();
    pending.forEach((resolve) => {
      resolve('js');
    });
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual([true, false]);
  });
  it('截图引擎实际提交', () => {
    const radios = elements(render()).filter((node) => node.type === 'input');
    radios.forEach((node) => {
      invoke(node, 'onChange');
    });
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-engine', 'plugin');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-engine', 'js');
  });
});
