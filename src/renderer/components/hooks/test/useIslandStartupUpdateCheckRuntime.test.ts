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
 * @description 启动更新与天气预警真实异步流程与订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
import type { StartupWeatherAlertPayload } from '../../../api/weather/types/WeatherAlert';
type Options = Parameters<typeof import('../useIslandStartupUpdateCheck').useIslandStartupUpdateCheck>[0];
const leaves = vi.hoisted(() => ({
  state: 'expand',
  notification: null as Parameters<Options['setNotificationRef']['current']>[0] | null,
  subscribers: new Set<() => void>(),
  token: vi.fn<() => string | null>(),
  weather: vi.fn<(token: string) => Promise<StartupWeatherAlertPayload>>(),
  source: vi.fn<typeof import('../../../api/user/userAccountApi.profile').fetchUpdateSourceUrl>()
}));
vi.mock('../../../store/isLandStore', () => ({
  default: {
    getState: () => ({
      state: leaves.state,
      notification: leaves.notification
    }),
    subscribe: (listener: () => void) => {
      leaves.subscribers.add(listener);
      return () => { leaves.subscribers.delete(listener); };
    }
  }
}));
vi.mock('../../../utils/SvgIcon', () => ({
  SvgIcon: {
    WEATHER: 'weather.svg'
  }
}));
vi.mock('../../../utils/userAccount', () => ({
  readLocalToken: leaves.token
}));
vi.mock('../../../api/weather/weatherApi', () => ({
  fetchStartupWeatherAlerts: leaves.weather
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
let notification: ReturnType<typeof vi.fn<Options['setNotificationRef']['current']>>;
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
/** 创建外部天气请求数据。
 * @param title - 标题
 * @param typeName - 类型
 * @param city - 城市
 * @param count - 预警数量
 * @returns API 叶响应
 */
function payload(title = 'Storm', typeName = 'Rain', city = 'Beijing', count = 1): StartupWeatherAlertPayload {
  return {
    location: {
      city,
      latitude: 40,
      longitude: 116
    },
    alerts: Array.from({
      length: count
    }, (...[, index]) => ({
      title,
      typeName,
      id: String(index),
      text: '',
      level: '',
      severity: '',
      severityColor: '',
      sender: '',
      pubTime: '2026-10-06'
    }))
  };
}
beforeEach(() => {
  resetHook();
  vi.resetAllMocks();
  leaves.state = 'expand';
  leaves.notification = null;
  leaves.subscribers.clear();
  startup = undefined;
  store = {};
  leaves.token.mockReturnValue(null);
  leaves.weather.mockResolvedValue(payload('', '', '', 0));
  leaves.source.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      url: 'https://source.example/latest'
    }
  });
  notification = vi.fn((data) => {
    leaves.state = 'notification';
    leaves.notification = data;
    leaves.subscribers.forEach((listener) => listener());
  });
  options = {
    language: 'zh-CN',
    t: vi.fn((key: string) => key),
    startupAutoCheckHandledRef: {
      current: false
    },
    setNotificationRef: {
      current: notification
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
  it('disabled auto prompt exits before token/source/weather or update reads', async () => {
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
    expect(api.storeRead).toHaveBeenCalledTimes(3);
  });
  it.each([null, 'basic'] as const)('falls back from pro source for token role %s', async (role) => {
    leaves.token.mockReturnValue(role ? token(role) : null);
    store['update-source'] = 'tencent-cos';
    await triggerStartup();
    expect(leaves.source).not.toHaveBeenCalled();
    expect(leaves.weather).not.toHaveBeenCalled();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });
  it('resolves a pro source and proceeds when there is no weather alert', async () => {
    const pro = token('pro');
    leaves.token.mockReturnValue(pro);
    store['update-source'] = 'aliyun-oss';
    await triggerStartup();
    expect(leaves.source).toHaveBeenCalledExactlyOnceWith(pro, 'aliyun-oss');
    expect(leaves.weather).toHaveBeenCalledExactlyOnceWith(pro);
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('aliyun-oss', 'https://source.example/latest');
    expect(notification).not.toHaveBeenCalled();
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
  it('disabled weather keeps a resolved pro updater URL and bypasses weather', async () => {
    leaves.token.mockReturnValue(token('pro'));
    store['update-source'] = 'tencent-cos';
    store['weather-alert-enabled'] = false;
    await triggerStartup();
    expect(leaves.weather).not.toHaveBeenCalled();
    expect(api.updaterCheck).toHaveBeenCalledWith('tencent-cos', 'https://source.example/latest');
  });
  it('weather failure warns and continues the startup update check', async () => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockRejectedValue(new Error('weather unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await triggerStartup();
    expect(warn).toHaveBeenCalledWith('[Updater] startup weather alert pre-check failed:', expect.any(Error));
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
  });

  it.each(['store', 'source', 'weather'])('bounds a stalled %s pre-check and ignores its late completion', async (stage) => {
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
    if (stage === 'weather') leaves.weather.mockReturnValueOnce(pending);
    await triggerStartup();
    expect(api.updaterCheck).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    const value = stage === 'weather' ? payload() : { ok: true, data: { url: 'https://late.example' } };
    resolve(value as never);
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(notification).not.toHaveBeenCalled();
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

  it('continues if UI locking prevents the weather notification from being displayed', async () => {
    notification.mockImplementation(() => {});
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload());
    await triggerStartup();
    expect(notification).toHaveBeenCalledOnce();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(leaves.subscribers.size).toBe(0);
  });

  it.each(['close', 'replace'])('continues once when the visible weather alert is removed by %s', async (action) => {
    vi.useFakeTimers();
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload());
    await triggerStartup();
    expect(leaves.subscribers.size).toBe(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.updaterCheck).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    if (action === 'close') leaves.state = 'idle';
    else leaves.notification = { title: 'Other', body: '', type: 'default' };
    Array.from(leaves.subscribers).forEach((listener) => listener());
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(leaves.subscribers.size).toBe(0);
    unmountHook();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
  });

  it('keeps waiting across language changes and releases weather subscriptions on unmount', async () => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload());
    await triggerStartup();
    options.language = 'en-US';
    mount();
    expect(api.updaterCheck).not.toHaveBeenCalled();
    expect(leaves.subscribers.size).toBe(1);
    unmountHook();
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(leaves.subscribers.size).toBe(0);
  });

  it('the explicit continue event works even when UI locking prevents dismissal', async () => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload());
    await triggerStartup();
    window.dispatchEvent(new Event('updater:startup-continue'));
    await settleHook();
    expect(leaves.state).toBe('notification');
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
    expect(leaves.subscribers.size).toBe(0);
    window.dispatchEvent(new Event('updater:startup-continue'));
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
  });
  it.each([['Storm', 'Rain', 'Beijing', 1, 'Storm', 'Beijing', 'notification.weatherAlert.bodySingle'], ['', 'Rain', 'Beijing', 2, 'Rain', 'Beijing', 'notification.weatherAlert.bodyWithMore'], ['', '', '', 1, 'notification.weatherAlert.defaultTitle', 'notification.weatherAlert.unknownCity', 'notification.weatherAlert.bodySingle']] as const)('shows weather notification with title %s and count %s', async (title, type, city, count, expectedTitle, expectedCity, body) => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload(title, type, city, count));
    await triggerStartup();
    expect(notification).toHaveBeenCalledWith({
      body,
      title: 'notification.weatherAlert.title',
      icon: 'weather.svg',
      type: 'weather-alert-startup',
      weatherAlertTime: '2026-10-06',
      startupUpdateSource: 'cloudflare-r2',
      startupUpdateResolvedUrl: undefined
    });
    expect(options.t).toHaveBeenCalledWith(body, expect.objectContaining({
      city: expectedCity,
      title: expectedTitle
    }));
    expect(api.updaterCheck).not.toHaveBeenCalled();
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
