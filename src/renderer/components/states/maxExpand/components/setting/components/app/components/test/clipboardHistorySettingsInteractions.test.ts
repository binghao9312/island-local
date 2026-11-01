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
 * @file clipboardHistorySettingsInteractions.test.ts
 * @description 剪贴板设置实际配置边界、取消、保存回滚和缓存清理失败回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardHistorySettingsSection } from '../ClipboardHistorySettingsSection';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => options?.count === undefined ? key : `${key}:${options.count}`
  })
}));
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
const removeItem = vi.fn<(key: string) => void>();
/**
 * 重绘实际剪贴板设置。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => ClipboardHistorySettingsSection());
}
/**
 * 等待配置和清理持久化回调。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 获取当前真实最大条数选项。
 * @returns 实际选中选项文字。
 */
function limitText(): string {
  return textContent(findElement(render(), (node) => String(elementProps(node).className) === 'settings-clipboard-limit-value'));
}
function stepper(direction: 'decrease' | 'increase') {
  return findElement(render(), (node) => elementProps(node)['aria-label'] === `settings.clipboardHistory.limit.${direction}`);
}
function limitWrites(): unknown[] {
  return api.storeWrite.mock.calls.filter(([key]) => key === 'clipboard-history-limit').map(([, value]) => value);
}
function clear(): void {
  invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.clipboardHistory.actions.clear'), 'onClick');
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('localStorage', {
    removeItem
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实配置读取与边界', () => {
  it.each([true, false, 'damaged'])('保存值%o合法布尔更新两个开关', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => node.type === 'input').map((node) => elementProps(node).checked)).toEqual(typeof value === 'boolean' ? [value, value] : [true, false]);
  });
  it.each([{
    value: 100,
    shown: 20
  }, {
    value: 50,
    shown: 20
  }, {
    value: -5,
    shown: 1
  }, {
    value: NaN,
    shown: 5
  }, {
    value: Infinity,
    shown: 5
  }, {
    value: 19.6,
    shown: 20
  }])('保存最大条数$value夹紧取整或使用默认', async ({
    value,
    shown
  }) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(limitText()).toBe(`settings.clipboardHistory.limit.value:${shown}`);
  });
  it('读取拒绝保留默认，卸载后迟到值忽略', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(limitText()).toBe('settings.clipboardHistory.limit.value:5');
    resetLifecycle();
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    unmountHooks();
    resolve(false);
    await settle();
    expect(elements(render()).filter((node) => node.type === 'input').map((node) => elementProps(node).checked)).toEqual([true, false]);
    expect(limitText()).toBe('settings.clipboardHistory.limit.value:5');
  });
});
describe('真实设置保存与回滚', () => {
  it.each([true, false])('写入失败=%s回滚两个开关', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    const tree = render();
    const [enabled, exit] = elements(tree).filter((node) => node.type === 'input');
    invoke(enabled, 'onChange', {
      target: {
        checked: false
      }
    });
    invoke(exit, 'onChange', {
      target: {
        checked: true
      }
    });
    expect(api.storeWrite).toHaveBeenCalledTimes(2);
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-enabled', false);
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-exit-max-expand-on-copy', true);
    await settle();
    expect(elements(render()).filter((node) => node.type === 'input').map((node) => elementProps(node).checked)).toEqual(failure ? [true, false] : [false, true]);
  });
  it.each([{
    direction: 'increase' as const,
    expected: 6
  }, {
    direction: 'decrease' as const,
    expected: 4
  }])('步进器$direction写入$expected，失败时回滚到5', async ({
    direction,
    expected
  }) => {
    invoke(stepper(direction), 'onClick');
    expect(limitWrites()).toEqual([expected]);
    expect(limitText()).toBe(`settings.clipboardHistory.limit.value:${expected}`);
    await settle();
    expect(limitText()).toBe(`settings.clipboardHistory.limit.value:${expected}`);
    resetLifecycle();
    api.storeWrite.mockRejectedValue(new Error('offline'));
    invoke(stepper(direction), 'onClick');
    expect(limitText()).toBe(`settings.clipboardHistory.limit.value:${expected}`);
    await settle();
    expect(limitText()).toBe('settings.clipboardHistory.limit.value:5');
  });
  it.each([{
    stored: 1,
    disabled: [true, false]
  }, {
    stored: 2,
    disabled: [false, false]
  }, {
    stored: 20,
    disabled: [false, true]
  }, {
    stored: 50,
    disabled: [false, true]
  }])('保存值$stored时减少/增加按钮禁用状态为$disabled', async ({
    stored,
    disabled
  }) => {
    api.storeRead.mockResolvedValue(stored);
    render();
    runEffects();
    await settle();
    expect([elementProps(stepper('decrease')).disabled, elementProps(stepper('increase')).disabled]).toEqual(disabled);
  });
  it('在20处增加和在1处减少不会越界', async () => {
    api.storeRead.mockResolvedValue(20);
    render();
    runEffects();
    await settle();
    expect(elementProps(stepper('increase')).disabled).toBe(true);
    for (let value = 19; value >= 1; value--) {
      invoke(stepper('decrease'), 'onClick');
    }
    expect(limitWrites()).toEqual(Array.from({ length: 19 }, (_, index) => 19 - index));
    expect(limitText()).toBe('settings.clipboardHistory.limit.value:1');
    expect(elementProps(stepper('decrease')).disabled).toBe(true);
  });
  it.each([{
    failure: false,
    storageFailure: false
  }, {
    failure: true,
    storageFailure: false
  }, {
    failure: false,
    storageFailure: true
  }, {
    failure: true,
    storageFailure: true
  }])('清理写入失败=$failure/缓存失败=$storageFailure提供准确反馈', async ({
    failure,
    storageFailure
  }) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    if (storageFailure) {removeItem.mockImplementation(() => {
      throw new Error('denied');
    });}
    clear();
    expect(removeItem).toHaveBeenCalledWith('eIsland_clipboard_history_recent');
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-recent', []);
    await settle();
    expect(textContent(render())).toContain(failure ? 'settings.clipboardHistory.messages.clearFailed' : 'settings.clipboardHistory.messages.clearSuccess');
  });
  it('再次清理等待中清除旧成功反馈，完成后重新显示', async () => {
    clear();
    await settle();
    expect(textContent(render())).toContain('settings.clipboardHistory.messages.clearSuccess');
    let resolve: () => void = () => undefined;
    api.storeWrite.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    clear();
    expect(textContent(render())).not.toContain('settings.clipboardHistory.messages.clearSuccess');
    resolve();
    await settle();
    expect(textContent(render())).toContain('settings.clipboardHistory.messages.clearSuccess');
  });
});
