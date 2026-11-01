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
 * @file useIslandStartupUpdateCheckRuntime.test.ts
 * @description 启动更新真实异步流程与订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
type Options = Parameters<typeof import('../useIslandStartupUpdateCheck').useIslandStartupUpdateCheck>[0];
const leaves = vi.hoisted(() => ({
  state: 'expand',
  subscribers: new Set<() => void>(),
  token: vi.fn<() => string | null>(),
  source: vi.fn<typeof import('../../../api/user/userAccountApi.profile').fetchUpdateSourceUrl>()
}));
vi.mock('../../../store/isLandStore', () => ({
  default: {
    getState: () => ({
      state: leaves.state
    }),
    subscribe: (listener: () => void) => {
      leaves.subscribers.add(listener);
      return () => { leaves.subscribers.delete(listener); };
    }
  }
}));
vi.mock('../../../utils/userAccount', () => ({
  readLocalToken: leaves.token
}));
vi.mock('../../../api/user/userAccountApi', () => ({
  fetchUpdateSourceUrl: leaves.source
}));
vi.mock('../../config/dynamicIslandConfig', async () => ({
  ...(await import('../../config/dynamicIslandUpdateSource')),
  ...(await import('../../config/dynamicIslandStorageKeys'))
}));
const { useIslandStartupUpdateCheck } = await import('../useIslandStartupUpdateCheck');
let startup: (() => void) | undefined;
let options: Options;
let store: Record<string, unknown>;
let api: ReturnType<typeof bridge>;
/** 生成真实归一化函数可解析的角色 JWT。
 * @param role - 角色
 * @returns JWT
 */
function token(role: string): string {
  return `header.${Buffer.from(JSON.stringify({
    role
  })).toString('base64url')}.signature`;
}
/** 创建 Electron 桥接叶实现。
 * @returns 注册回调、存储及更新接口
 */
function bridge() {
  return {
    onUpdaterStartupAutoCheckRequest: vi.fn((callback: () => void) => {
      startup = callback;
      return vi.fn();
    }),
    storeRead: vi.fn((key: string): Promise<unknown> => Promise.resolve(store[key])),
    updaterCheck: vi.fn<(source: string, url?: string) => Promise<void>>(() => Promise.resolve())
  };
}
/** 提交真实 Hook 生命周期。
 * @returns 完成后处理函数
 */
function mount(): void {
  renderHook(useIslandStartupUpdateCheck, options);
  flushHookEffects();
}
/** 调用捕获的原生启动订阅并等待真实 async 回调。
 */
async function triggerStartup(): Promise<void> {
  mount();
  startup?.();
  await settleHook();
}
beforeEach(() => {
  resetHook();
  vi.resetAllMocks();
  leaves.state = 'expand';
  leaves.subscribers.clear();
  startup = undefined;
  store = {};
  leaves.token.mockReturnValue(null);
  leaves.source.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      url: 'https://source.example/latest'
    }
  });
  options = {
    language: 'zh-CN',
    startupAutoCheckHandledRef: {
      current: false
    }
  };
  api = bridge();
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    api
  }));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
// 这些用例覆盖更新实现本身，需要开启更新总开关。
vi.mock('../../../../shared/updatesConfig', () => ({ UPDATES_ENABLED: true }));
describe('useIslandStartupUpdateCheck runtime', () => {
  it('handles startup once and unregisters its subscription', async () => {
    await triggerStartup();
    startup?.();
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    const [unsubscribeStartup] = api.onUpdaterStartupAutoCheckRequest.mock.results;
    unmountHook();
    expect(unsubscribeStartup.value).toHaveBeenCalledTimes(1);
  });
  it('disabled auto prompt exits before token/source or update reads', async () => {
    store['update-auto-prompt-enabled'] = false;
    await triggerStartup();
    expect(api.storeRead).toHaveBeenCalledTimes(1);
    expect(leaves.token).not.toHaveBeenCalled();
    expect(api.updaterCheck).not.toHaveBeenCalled();
  });
  it('read failures use defaults and update rejection is swallowed', async () => {
    api.storeRead.mockRejectedValue(new Error('read'));
    api.updaterCheck.mockRejectedValue(new Error('offline'));
    await triggerStartup();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    expect(api.storeRead).toHaveBeenCalledTimes(2);
  });
  it.each([null, 'basic'] as const)('falls back from pro source for token role %s', async (role) => {
    leaves.token.mockReturnValue(role ? token(role) : null);
    store['update-source'] = 'tencent-cos';
    await triggerStartup();
    expect(leaves.source).not.toHaveBeenCalled();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });
  it('resolves a pro source and proceeds with the update check', async () => {
    const pro = token('pro');
    leaves.token.mockReturnValue(pro);
    store['update-source'] = 'aliyun-oss';
    await triggerStartup();
    expect(leaves.source).toHaveBeenCalledExactlyOnceWith(pro, 'aliyun-oss');
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('aliyun-oss', 'https://source.example/latest');
  });
  it.each([{
    ok: false,
    code: 403,
    message: 'denied'
  }, {
    ok: true,
    code: 200,
    message: ''
  }, {
    ok: true,
    code: 200,
    message: '',
    data: {
      url: ''
    }
  }])('falls back when source response has no usable url: %j', async (response) => {
    leaves.token.mockReturnValue(token('pro'));
    store['update-source'] = 'tencent-cos';
    leaves.source.mockResolvedValue(response);
    await triggerStartup();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });
  it.each(['store', 'source'])('bounds a stalled %s pre-check and ignores its late completion', async (stage) => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    leaves.token.mockReturnValue(token('pro'));
    let resolve: (value: never) => void = () => {};
    const pending = new Promise<never>((done) => { resolve = done; });
    if (stage === 'store') api.storeRead.mockReturnValueOnce(pending);
    if (stage === 'source') {
      store['update-source'] = 'tencent-cos';
      leaves.source.mockReturnValueOnce(pending);
    }
    await triggerStartup();
    expect(api.updaterCheck).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    resolve({ ok: true, data: { url: 'https://late.example' } } as never);
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back to a public source when pro source lookup rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    leaves.token.mockReturnValue(token('pro'));
    store['update-source'] = 'tencent-cos';
    leaves.source.mockRejectedValueOnce(new Error('source unavailable'));
    await triggerStartup();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });

  it('absent optional bridge/listener registration and teardown are safe', () => {
    vi.stubGlobal('window', {});
    mount();
    unmountHook();
    resetHook();
    vi.stubGlobal('window', {
      api: {}
    });
    mount();
    unmountHook();
  });
  it('registered callback tolerates the bridge disappearing before startup', async () => {
    mount();
    vi.stubGlobal('window', {});
    startup?.();
    await settleHook();
    expect(api.updaterCheck).not.toHaveBeenCalled();
  });
  it('bridge without optional store methods uses default values', async () => {
    mount();
    vi.stubGlobal('window', {
      api: {
        updaterCheck: api.updaterCheck
      }
    });
    startup?.();
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledWith('cloudflare-r2', undefined);
  });
  it('language change cleans the startup subscription and creates a new one', () => {
    mount();
    const [first] = api.onUpdaterStartupAutoCheckRequest.mock.results;
    options.language = 'en-US';
    mount();
    expect(first.value).toHaveBeenCalledTimes(1);
    expect(api.onUpdaterStartupAutoCheckRequest).toHaveBeenCalledTimes(2);
  });
});
