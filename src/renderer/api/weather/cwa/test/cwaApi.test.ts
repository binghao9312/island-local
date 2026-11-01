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
 * @file cwaApi.test.ts
 * @description CWA 接口：縣市解析、WeatherData 组装、无授权码状态、请求参数与错误分类、鄉鎮筛选退回
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadKey: vi.fn<() => string>(),
  netFetch: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../store/utils/storage', () => ({
  loadCwaApiKey: mocks.loadKey,
  loadNetworkConfig: () => ({ timeoutMs: 10000 }),
}));
vi.mock('../../../../utils/logger', () => ({ logger: mocks.logger }));

import { buildWeatherData, CwaError, fetchCwaWeather, resolveCwaCounty, taiwanDateString } from '../cwaApi';
import { parseCurrentForecast, parseDailyForecasts, parseNearestObservation } from '../cwaParser';
import { EMPTY_FORECAST_FIXTURE, FORECAST_3D_FIXTURE, FORECAST_WEEK_FIXTURE, OBSERVATION_FIXTURE } from './cwaFixtures';

const NOW = new Date('2026-11-01T16:30:00+08:00');
const TAIPEI = { latitude: 25.0141, longitude: 121.5341 };

type FetchResult = { ok: boolean; status: number; body: string };

function ok(body: unknown): FetchResult {
  return { ok: true, status: 200, body: JSON.stringify(body) };
}

/** 按数据集编号路由 netFetch 响应 */
function routeFetch(overrides: Record<string, FetchResult> = {}): void {
  mocks.netFetch.mockImplementation(async (url: string) => {
    const dataset = new URL(url).pathname.split('/').pop() ?? '';
    if (overrides[dataset]) return overrides[dataset];
    if (dataset === 'O-A0003-001') return ok(OBSERVATION_FIXTURE);
    if (dataset === 'F-D0047-061') return ok(FORECAST_3D_FIXTURE);
    if (dataset === 'F-D0047-063') return ok(FORECAST_WEEK_FIXTURE);
    throw new Error(`unexpected dataset ${dataset}`);
  });
}

function requestedUrls(): URL[] {
  return mocks.netFetch.mock.calls.map((call) => new URL(call[0] as string));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  mocks.loadKey.mockReset().mockReturnValue('CWA-TEST-KEY');
  mocks.netFetch.mockReset();
  Object.values(mocks.logger).forEach((fn) => fn.mockClear());
  vi.stubGlobal('window', { api: { netFetch: mocks.netFetch } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('taiwanDateString', () => {
  it('uses the UTC+8 calendar date', () => {
    expect(taiwanDateString(new Date('2026-11-01T17:00:00Z'))).toBe('2026-11-02');
    expect(taiwanDateString(new Date('2026-11-01T15:59:00Z'))).toBe('2026-11-01');
  });
});

describe('resolveCwaCounty', () => {
  it.each([
    ['台北市', '臺北市'],
    ['臺北市', '臺北市'],
    ['新北市', '新北市'],
  ])('uses the explicit county %s', (county, expected) => {
    expect(resolveCwaCounty({ ...TAIPEI, county }).name).toBe(expected);
  });

  it('rejects a non-Taiwan country code', () => {
    expect(() => resolveCwaCounty({ latitude: 35.68, longitude: 139.69, countryCode: 'JP' })).toThrowError(CwaError);
    expect(() => resolveCwaCounty({ ...TAIPEI, countryCode: 'jp' })).toThrowError(/country JP/);
  });

  it('falls back to the city name, then to the nearest county by coordinates', () => {
    expect(resolveCwaCounty({ latitude: 0, longitude: 0, city: '台南' }).name).toBe('臺南市');
    expect(resolveCwaCounty({ latitude: 22.63, longitude: 120.3, city: '某處', countryCode: 'TW' }).name).toBe('高雄市');
    expect(resolveCwaCounty({ latitude: 24.45, longitude: 118.38 }).name).toBe('金門縣');
  });

  it('throws out-of-region for coordinates outside Taiwan', () => {
    expect(() => resolveCwaCounty({ latitude: 39.9, longitude: 116.4, city: 'Beijing' })).toThrowError(
      expect.objectContaining({ code: 'out-of-region' }),
    );
  });
});

describe('buildWeatherData', () => {
  const observation = parseNearestObservation(OBSERVATION_FIXTURE, TAIPEI.latitude, TAIPEI.longitude);
  const current = parseCurrentForecast(FORECAST_3D_FIXTURE, '大安區', 0, 0, NOW);
  const daily = parseDailyForecasts(FORECAST_WEEK_FIXTURE, '大安區', 0, 0);

  it('combines observation, current forecast and the next two days', () => {
    const data = buildWeatherData({ observation, current, daily, now: NOW });
    expect(data).toMatchObject({
      temperature: 25,
      description: '多雲',
      humidity: 71,
      windSpeed: 3.4,
      uvIndex: 0,
      precipitationProbability: 20,
      iconCode: 2,
    });
    expect(data.forecast).toHaveLength(2);
    expect(data.forecast[0]).toMatchObject({ temperatureMax: 27, temperatureMin: 20, precipitationProbability: 50, windSpeed: 5, uvIndex: 7, description: '多雲時陰', iconCode: 3 });
    expect(data.forecast[1]).toMatchObject({ temperatureMax: 29, temperatureMin: 21, precipitationProbability: 10 });
  });

  it('falls back to the forecast when no station reports', () => {
    const data = buildWeatherData({ observation: null, current, daily, now: NOW });
    expect(data).toMatchObject({ temperature: 25, humidity: 70, windSpeed: 2, description: '多雲' });
  });

  it('marks unavailable rain probability with -1 and throws without any temperature', () => {
    expect(buildWeatherData({ observation, current: null, daily: [], now: NOW }).precipitationProbability).toBe(-1);
    expect(() => buildWeatherData({ observation: null, current: null, daily, now: NOW })).toThrowError(CwaError);
  });
});

describe('fetchCwaWeather without an API key', () => {
  it.each(['', undefined])('throws no-key and never touches the network (key=%o)', async (key) => {
    mocks.loadKey.mockReturnValue(key as string);
    await expect(fetchCwaWeather({ ...TAIPEI, county: '臺北市' })).rejects.toMatchObject({ name: 'CwaError', code: 'no-key' });
    expect(mocks.netFetch).not.toHaveBeenCalled();
  });
});

describe('fetchCwaWeather requests', () => {
  it('queries the observation and both forecast datasets with the key and township filter', async () => {
    routeFetch();
    const data = await fetchCwaWeather({ ...TAIPEI, city: '臺北市大安區', county: '台北市', township: '大安區' });
    expect(data.temperature).toBe(25);
    expect(data.description).toBe('多雲');

    const urls = requestedUrls();
    expect(urls.map((url) => url.pathname.split('/').pop()).sort()).toEqual(['F-D0047-061', 'F-D0047-063', 'O-A0003-001']);
    for (const url of urls) {
      expect(url.origin).toBe('https://opendata.cwa.gov.tw');
      expect(url.pathname).toContain('/api/v1/rest/datastore/');
      expect(url.searchParams.get('Authorization')).toBe('CWA-TEST-KEY');
      expect(url.searchParams.get('format')).toBe('JSON');
    }
    const threeDay = urls.find((url) => url.pathname.endsWith('F-D0047-061'));
    expect(threeDay?.searchParams.get('LocationName')).toBe('大安區');
    expect(threeDay?.searchParams.get('ElementName')).toBe('溫度,相對濕度,3小時降雨機率,風速,天氣現象');
    const week = urls.find((url) => url.pathname.endsWith('F-D0047-063'));
    expect(week?.searchParams.get('ElementName')).toContain('12小時降雨機率');
    const observation = urls.find((url) => url.pathname.endsWith('O-A0003-001'));
    expect(observation?.searchParams.has('LocationName')).toBe(false);
  });

  it('does not use a county-only city name as the township filter', async () => {
    routeFetch();
    await fetchCwaWeather({ ...TAIPEI, city: '台北市', countryCode: 'TW' });
    const threeDay = requestedUrls().find((url) => url.pathname.endsWith('F-D0047-061'));
    expect(threeDay?.searchParams.has('LocationName')).toBe(false);
  });

  it('retries the whole county when the township filter returns nothing', async () => {
    mocks.netFetch.mockImplementation(async (url: string) => {
      const parsed = new URL(url);
      const dataset = parsed.pathname.split('/').pop();
      if (dataset === 'O-A0003-001') return ok(OBSERVATION_FIXTURE);
      if (parsed.searchParams.has('LocationName')) return ok(EMPTY_FORECAST_FIXTURE);
      return ok(dataset === 'F-D0047-061' ? FORECAST_3D_FIXTURE : FORECAST_WEEK_FIXTURE);
    });
    const data = await fetchCwaWeather({ latitude: 25.026, longitude: 121.543, county: '臺北市', township: '不存在區' });
    expect(data.precipitationProbability).toBe(20);
    expect(data.forecast[0].precipitationProbability).toBe(50);
    const forecastCalls = requestedUrls().filter((url) => url.pathname.includes('F-D0047'));
    expect(forecastCalls).toHaveLength(4);
  });

  it('never writes the API key to the logs', async () => {
    routeFetch();
    await fetchCwaWeather({ ...TAIPEI, county: '臺北市' });
    const logged = JSON.stringify(Object.values(mocks.logger).flatMap((fn) => fn.mock.calls));
    expect(logged).not.toContain('CWA-TEST-KEY');
  });

  it('rejects out-of-region locations before any request', async () => {
    await expect(fetchCwaWeather({ latitude: 35.68, longitude: 139.69, city: 'Tokyo', countryCode: 'JP' })).rejects.toMatchObject({ code: 'out-of-region' });
    expect(mocks.netFetch).not.toHaveBeenCalled();
  });
});

describe('fetchCwaWeather error classification', () => {
  it.each([401, 403])('maps HTTP %i to invalid-key', async (status) => {
    routeFetch({ 'O-A0003-001': { ok: false, status, body: '{"message":"Unauthorized"}' } });
    await expect(fetchCwaWeather({ ...TAIPEI, county: '臺北市' })).rejects.toMatchObject({ code: 'invalid-key' });
  });

  it('maps other HTTP failures to network', async () => {
    routeFetch({ 'F-D0047-061': { ok: false, status: 500, body: 'oops' } });
    await expect(fetchCwaWeather({ ...TAIPEI, county: '臺北市' })).rejects.toMatchObject({ code: 'network' });
  });

  it('maps a non-JSON body to invalid-response', async () => {
    routeFetch({ 'O-A0003-001': { ok: true, status: 200, body: '<html>blocked</html>' } });
    await expect(fetchCwaWeather({ ...TAIPEI, county: '臺北市' })).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('maps a payload without usable temperature to invalid-response', async () => {
    routeFetch({
      'O-A0003-001': ok({ records: { Station: [] } }),
      'F-D0047-061': ok(EMPTY_FORECAST_FIXTURE),
      'F-D0047-063': ok(EMPTY_FORECAST_FIXTURE),
    });
    await expect(fetchCwaWeather({ ...TAIPEI, county: '臺北市' })).rejects.toMatchObject({ code: 'invalid-response' });
  });
});
