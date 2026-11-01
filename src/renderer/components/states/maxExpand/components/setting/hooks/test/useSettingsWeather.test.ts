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
 * @file useSettingsWeather.test.ts
 * @description 天气位置保存、优先级、CWA 授权码保存与自定义位置测试流程、失败恢复回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsWeather } from '../useSettingsWeather';
import { CwaError } from '../../../../../../../api/weather/cwa/cwaApi';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
const mocks = vi.hoisted(() => ({
  resolveCity: vi.fn<() => Promise<{
    latitude: number;
    longitude: number;
    city: string;
    countryCode?: string;
    country?: string;
    regionName?: string;
    county?: string;
    township?: string;
  }>>(),
  loadLocation: vi.fn<() => {
    customLocation: {
      latitude: number;
      longitude: number;
      city: string;
    } | null;
  }>(),
  saveLocation: vi.fn(),
  loadKey: vi.fn<() => string>(),
  saveKey: vi.fn(),
  fetchCwa: vi.fn<(config: unknown) => Promise<{ temperature: number; description: string }>>(),
}));
vi.mock('../../../../../../../api/weather/geocodingApi', () => ({
  resolveLocationByKeyword: mocks.resolveCity
}));
vi.mock('../../../../../../../api/weather/cwa/cwaApi', async (original) => ({
  ...(await original<typeof import('../../../../../../../api/weather/cwa/cwaApi')>()),
  fetchCwaWeather: mocks.fetchCwa
}));
vi.mock('../../../../../../../store/utils/storage', () => ({
  DEFAULT_WEATHER_LOCATION_PRIORITY: 'ip',
  loadWeatherLocationConfig: mocks.loadLocation,
  saveWeatherLocationConfig: mocks.saveLocation,
  loadCwaApiKey: mocks.loadKey,
  saveCwaApiKey: mocks.saveKey
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsWeather>[0];
const fetchWeatherData = vi.fn<Options['fetchWeatherData']>();
const t = vi.fn<(key: string, values?: Record<string, unknown>) => string>((key) => key);
const city = {
  latitude: 39.12345,
  longitude: 116.54321,
  city: 'Beijing'
};
/**
 * 重复执行真实天气 Hook，保留配置及忙碌状态。
 * @returns Hook 返回的实际状态和异步操作。
 */
function render() {
  return renderWithHooks(() => useSettingsWeather({
    fetchWeatherData,
    t: t as unknown as Options['t']
  }));
}
/**
 * 等待位置解析、并行服务和告警保存队列。
 * @returns 异步回调处理完毕。
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
  mocks.resolveCity.mockResolvedValue(city);
  mocks.loadLocation.mockReturnValue({
    customLocation: null
  });
  mocks.loadKey.mockReturnValue('');
  mocks.fetchCwa.mockResolvedValue({
    temperature: 27.4,
    description: '多雲'
  });
  fetchWeatherData.mockResolvedValue('ok');
  t.mockImplementation((key) => key);
  vi.stubGlobal('window', {
    api: {}
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('实际定位配置和优先级', () => {
  it.each([{
    priority: 'ip',
    hasInput: false,
    hasExisting: false
  }, {
    priority: 'custom',
    hasInput: false,
    hasExisting: false
  }, {
    priority: 'ip',
    hasInput: false,
    hasExisting: true
  }, {
    priority: 'custom',
    hasInput: false,
    hasExisting: true
  }, {
    priority: 'ip',
    hasInput: true,
    hasExisting: false
  }, {
    priority: 'custom',
    hasInput: true,
    hasExisting: false
  }] as const)('切换$priority，输入=$hasInput，旧位置=$hasExisting', async ({
    priority,
    hasInput,
    hasExisting
  }) => {
    mocks.loadLocation.mockReturnValue({
      customLocation: hasExisting ? city : null
    });
    if (hasInput) render().setWeatherCustomCityInput(' Beijing ');
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old test'
    });
    await render().applyWeatherLocationPriority(priority);
    expect(render().weatherLocationPriority).toBe(priority);
    expect(mocks.resolveCity).toHaveBeenCalledTimes(hasInput ? 1 : 0);
    expect(mocks.saveLocation).toHaveBeenCalledWith({
      priority,
      customLocation: hasInput || hasExisting ? city : null
    });
    expect(render().weatherLocationConfigMessage?.type).toBe(priority === 'custom' && !hasInput && !hasExisting ? 'error' : 'success');
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    expect(fetchWeatherData).toHaveBeenCalledWith(undefined, true);
  });
  it.each([new Error('city unavailable'), 'failed'])('切换解析错误%o显示错误并保持所选优先级', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().applyWeatherLocationPriority('custom');
    expect(render().weatherLocationConfigMessage?.type).toBe('error');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.switchPriorityFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(mocks.saveLocation).not.toHaveBeenCalled();
  });
  it('切换时已保存配置、刷新失败不反转成功消息', async () => {
    fetchWeatherData.mockRejectedValue(new Error('weather offline'));
    await render().applyWeatherLocationPriority('ip');
    await settle();
    expect(render().weatherLocationConfigMessage?.type).toBe('success');
  });
  it('自定义优先级需要城市；不发解析和保存请求', async () => {
    render().setWeatherLocationPriority('custom');
    render().setWeatherCustomCityInput('  ');
    await render().saveWeatherLocationSettings();
    expect(render().weatherLocationConfigMessage?.text).toBe('settings.weather.messages.customNeedsCity');
    expect(mocks.saveLocation).not.toHaveBeenCalled();
    expect(mocks.resolveCity).not.toHaveBeenCalled();
  });
  it.each([false, true])('保存配置含城市=%s并清空旧测试消息', async (withCity) => {
    if (withCity) {
      render().setWeatherCustomCityInput(' Beijing ');
      render().setWeatherLocationPriority('custom');
    }
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old'
    });
    fetchWeatherData.mockRejectedValue(new Error('refresh'));
    await render().saveWeatherLocationSettings();
    await settle();
    expect(mocks.saveLocation).toHaveBeenCalledWith({
      priority: withCity ? 'custom' : 'ip',
      customLocation: withCity ? city : null
    });
    expect(render().weatherLocationConfigMessage?.text).toBe(withCity ? 'settings.weather.messages.configSavedWithCity' : 'settings.weather.messages.configSaved');
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    if (withCity) {
      expect(t).toHaveBeenCalledWith('settings.weather.messages.configSavedWithCity', expect.objectContaining({
        city: 'Beijing',
        lat: '39.1234',
        lng: '116.5432'
      }));
    }
  });
  it.each([new Error('resolve failed'), 'failure'])('保存解析错误%o不会保存', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().saveWeatherLocationSettings();
    expect(render().weatherLocationConfigMessage?.text).toBe('settings.weather.messages.cityResolveFailed');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.cityResolveFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(mocks.saveLocation).not.toHaveBeenCalled();
  });
});
describe('实际城市测试（CWA）', () => {
  it('空城市立即提示，禁止外部服务', async () => {
    render().setWeatherCustomCityInput(' ');
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTestMessage?.text).toBe('settings.weather.messages.cityRequired');
    expect(mocks.resolveCity).not.toHaveBeenCalled();
    expect(mocks.fetchCwa).not.toHaveBeenCalled();
  });
  it.each([new Error('city failed'), 'failure'])('城市解析错误%o恢复busy并使用错误回退', async (failure) => {
    render().setWeatherCustomCityInput('city');
    mocks.resolveCity.mockRejectedValue(failure);
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTesting).toBe(false);
    expect(render().weatherCustomLocationTestMessage?.text).toBe('settings.weather.messages.cityResolveFailed');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.cityResolveFailed', expect.objectContaining({
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
    expect(mocks.fetchCwa).not.toHaveBeenCalled();
  });
  it('解析出的縣市、鄉鎮与国家代码原样传给 CWA 并报告成功', async () => {
    mocks.resolveCity.mockResolvedValue({
      latitude: 24.9676,
      longitude: 121.5417,
      city: '新北市新店區',
      countryCode: 'TW',
      county: '新北市',
      township: '新店區'
    });
    render().setWeatherCustomCityInput(' 新北市新店區 ');
    await render().testWeatherCustomLocation();
    expect(mocks.fetchCwa).toHaveBeenCalledWith({
      latitude: 24.9676,
      longitude: 121.5417,
      city: '新北市新店區',
      county: '新北市',
      township: '新店區',
      countryCode: 'TW'
    });
    expect(render().weatherCustomLocationTestMessage?.type).toBe('success');
    expect(t).toHaveBeenCalledWith('settings.weather.messages.cwaAvailable', expect.objectContaining({
      temperature: 27.4,
      description: '多雲'
    }));
    expect(render().weatherCustomLocationTesting).toBe(false);
  });
  it.each([
    ['no-key', 'settings.weather.cwa.status.noKey'],
    ['invalid-key', 'settings.weather.cwa.status.invalidKey'],
    ['out-of-region', 'settings.weather.cwa.status.outOfRegion']
  ] as const)('CWA 错误 %s 显示对应提示', async (code, key) => {
    mocks.fetchCwa.mockRejectedValue(new CwaError(code, code));
    render().setWeatherCustomCityInput('台北');
    await render().testWeatherCustomLocation();
    expect(render().weatherCustomLocationTestMessage?.type).toBe('error');
    expect(t).toHaveBeenCalledWith(key, expect.anything());
    expect(render().weatherCustomLocationTesting).toBe(false);
  });
  it.each([new Error('HTTP 500'), 'unknown'])('其他错误%o回退为不可用提示', async (failure) => {
    mocks.fetchCwa.mockRejectedValue(failure);
    render().setWeatherCustomCityInput('台北');
    await render().testWeatherCustomLocation();
    expect(t).toHaveBeenCalledWith('settings.weather.messages.providerUnavailable', expect.objectContaining({
      name: 'CWA',
      error: failure instanceof Error ? failure.message : 'settings.common.unknownError'
    }));
  });
  it('请求等待时busy为true并清除旧消息，完成后恢复', async () => {
    render().setWeatherCustomCityInput('city');
    render().setWeatherCustomLocationTestMessage({
      type: 'error',
      text: 'old'
    });
    let resolve: (value: { temperature: number; description: string }) => void = () => undefined;
    mocks.fetchCwa.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    const pending = render().testWeatherCustomLocation();
    await settle();
    expect(render().weatherCustomLocationTesting).toBe(true);
    expect(render().weatherCustomLocationTestMessage).toBeNull();
    resolve({ temperature: 20, description: '晴' });
    await pending;
    expect(render().weatherCustomLocationTesting).toBe(false);
  });
});
describe('CWA 授权码', () => {
  it('初始值读取已保存的授权码', () => {
    mocks.loadKey.mockReturnValue('CWA-SAVED');
    expect(render().cwaApiKeyInput).toBe('CWA-SAVED');
  });
  it('保存时去除空白、写入存储并按刷新结果提示可用', async () => {
    render().setCwaApiKeyInput('  CWA-NEW  ');
    await render().saveCwaApiKeySetting();
    expect(mocks.saveKey).toHaveBeenCalledWith('CWA-NEW');
    expect(fetchWeatherData).toHaveBeenCalledWith(undefined, true);
    expect(render().cwaApiKeyInput).toBe('CWA-NEW');
    expect(render().cwaApiKeyMessage).toEqual({ type: 'success', text: 'settings.weather.cwa.messages.valid' });
  });
  it.each([
    ['invalid-key', 'error', 'settings.weather.cwa.messages.invalid'],
    ['out-of-region', 'success', 'settings.weather.cwa.messages.savedOutOfRegion'],
    ['error', 'error', 'settings.weather.cwa.messages.checkFailed'],
    ['no-key', 'error', 'settings.weather.cwa.messages.checkFailed']
  ] as const)('刷新状态 %s 对应提示', async (status, type, text) => {
    fetchWeatherData.mockResolvedValue(status);
    render().setCwaApiKeyInput('CWA-KEY');
    await render().saveCwaApiKeySetting();
    expect(render().cwaApiKeyMessage).toEqual({ type, text });
  });
  it('保存空值等同清除并刷新到空状态', async () => {
    render().setCwaApiKeyInput('   ');
    await render().saveCwaApiKeySetting();
    expect(mocks.saveKey).toHaveBeenCalledWith('');
    expect(fetchWeatherData).toHaveBeenCalledWith(undefined, true);
    expect(render().cwaApiKeyMessage?.text).toBe('settings.weather.cwa.messages.cleared');
  });
  it('清除按钮清空输入、存储并刷新天气', () => {
    render().setCwaApiKeyInput('CWA-KEY');
    render().clearCwaApiKeySetting();
    expect(mocks.saveKey).toHaveBeenCalledWith('');
    expect(render().cwaApiKeyInput).toBe('');
    expect(fetchWeatherData).toHaveBeenCalledWith(undefined, true);
    expect(render().cwaApiKeyMessage?.text).toBe('settings.weather.cwa.messages.cleared');
  });
  it('地理编码出的縣市与鄉鎮写入自定义位置配置', async () => {
    mocks.resolveCity.mockResolvedValue({
      latitude: 25.05,
      longitude: 121.52,
      city: '臺北市',
      countryCode: 'TW',
      country: '台灣',
      regionName: '臺北市',
      county: '臺北市'
    });
    render().setWeatherCustomCityInput('台北');
    await render().saveWeatherLocationSettings();
    expect(mocks.saveLocation).toHaveBeenCalledWith({
      priority: 'ip',
      customLocation: {
        latitude: 25.05,
        longitude: 121.52,
        city: '臺北市',
        countryCode: 'TW',
        country: '台灣',
        regionName: '臺北市',
        county: '臺北市'
      }
    });
  });
});
