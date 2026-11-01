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
 * @file geocodingApi.test.ts
 * @description 地理编码：Open-Meteo 结果到 CWA 縣市 / 鄉鎮映射（含 台/臺 归一）、关键字解析与坐标补齐
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  netFetch: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../store/utils/storage', () => ({ loadNetworkConfig: () => ({ timeoutMs: 10000 }) }));
vi.mock('../../../utils/logger', () => ({ logger: mocks.logger }));
vi.mock('../../../i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? '')),
  },
}));

import {
  mapGeocodingResult,
  pickGeocodingResult,
  resolveLocationByCoordinates,
  resolveLocationByKeyword,
} from '../geocodingApi';
import type { GeocodingResult } from '../geocodingApi';

const XINDIAN: GeocodingResult = {
  name: '新店區',
  latitude: 24.9676,
  longitude: 121.5417,
  country_code: 'TW',
  country: '台灣',
  admin1: '臺灣省',
  admin2: '新北市',
  admin3: '新店區',
};

const TOKYO: GeocodingResult = { name: 'Tokyo', latitude: 35.6895, longitude: 139.6917, country_code: 'JP', country: 'Japan', admin1: 'Tokyo' };

function reply(results: GeocodingResult[]): { ok: boolean; status: number; body: string } {
  return { ok: true, status: 200, body: JSON.stringify({ results }) };
}

function searchedNames(): string[] {
  return mocks.netFetch.mock.calls.map((call) => new URL(call[0] as string).searchParams.get('name') ?? '');
}

beforeEach(() => {
  mocks.netFetch.mockReset();
  vi.stubGlobal('window', { api: { netFetch: mocks.netFetch } });
});

describe('mapGeocodingResult', () => {
  it('maps admin2 / admin3 of a Taiwan result to county and township', () => {
    expect(mapGeocodingResult(XINDIAN)).toMatchObject({
      city: '新北市新店區',
      county: '新北市',
      township: '新店區',
      regionName: '新北市',
      countryCode: 'TW',
    });
  });

  it('normalizes 台/臺 and simplified characters in admin names', () => {
    const mapped = mapGeocodingResult({ name: '大安区', latitude: 25.026, longitude: 121.543, country_code: 'TW', admin2: '台北市', admin3: '大安区' });
    expect(mapped).toMatchObject({ county: '臺北市', township: '大安區', city: '臺北市大安區' });
  });

  it('falls back to the nearest county when admin2 is missing', () => {
    const mapped = mapGeocodingResult({ name: '高雄', latitude: 22.63, longitude: 120.3, country_code: 'TW' });
    expect(mapped).toMatchObject({ county: '高雄市', city: '高雄市' });
    expect(mapped?.township).toBeUndefined();
  });

  it('keeps non-Taiwan results untouched', () => {
    expect(mapGeocodingResult(TOKYO)).toEqual({
      latitude: 35.6895,
      longitude: 139.6917,
      city: 'Tokyo',
      countryCode: 'JP',
      country: 'Japan',
      regionName: 'Tokyo',
    });
  });

  it('returns null without coordinates', () => {
    expect(mapGeocodingResult({ name: 'X', country_code: 'TW' })).toBeNull();
  });
});

describe('pickGeocodingResult', () => {
  it('prefers Taiwan results over foreign ones', () => {
    expect(pickGeocodingResult([TOKYO, XINDIAN], 'x', null)?.county).toBe('新北市');
  });

  it('prefers the county named in the input, then an exact name match', () => {
    const otherCounty: GeocodingResult = { ...XINDIAN, admin2: '臺北市', admin3: '大安區', name: '大安區', latitude: 25.026, longitude: 121.543 };
    const newTaipei = { name: '新北市', forecast3d: 'F-D0047-069', forecastWeek: 'F-D0047-071', latitude: 25.012, longitude: 121.4657 };
    expect(pickGeocodingResult([otherCounty, XINDIAN], '新店區', newTaipei)?.township).toBe('新店區');
    expect(pickGeocodingResult([otherCounty, XINDIAN], '大安區', null)?.township).toBe('大安區');
  });

  it('returns null for an empty candidate list', () => {
    expect(pickGeocodingResult([], 'x', null)).toBeNull();
  });
});

describe('resolveLocationByKeyword', () => {
  it.each([
    ['台北', '臺北市'],
    ['臺北市', '臺北市'],
    ['高雄', '高雄市'],
    ['台东县', '臺東縣'],
  ])('resolves the county %s offline to %s', async (keyword, county) => {
    const location = await resolveLocationByKeyword(keyword);
    expect(location).toMatchObject({ city: county, county, countryCode: 'TW' });
    expect(location.township).toBeUndefined();
    expect(mocks.netFetch).not.toHaveBeenCalled();
  });

  it('searches Taiwan only with the township part when a county is included', async () => {
    mocks.netFetch.mockResolvedValue(reply([XINDIAN]));
    const location = await resolveLocationByKeyword('新北市新店區');
    expect(location).toMatchObject({ county: '新北市', township: '新店區', city: '新北市新店區' });
    const url = new URL(mocks.netFetch.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe('新店區');
    expect(url.searchParams.get('countryCode')).toBe('TW');
    expect(url.searchParams.get('language')).toBe('zh');
  });

  it('retries with the swapped 台/臺 character when the first search is empty', async () => {
    mocks.netFetch.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply([{ ...XINDIAN, name: '臺西鄉', admin2: '雲林縣', admin3: '臺西鄉', latitude: 23.7, longitude: 120.2 }]));
    const location = await resolveLocationByKeyword('台西鄉');
    expect(searchedNames()).toEqual(['台西鄉', '臺西鄉']);
    expect(location).toMatchObject({ county: '雲林縣', township: '臺西鄉' });
  });

  it('falls back to the county seat with the typed township when geocoding finds nothing', async () => {
    mocks.netFetch.mockResolvedValue(reply([]));
    const location = await resolveLocationByKeyword('臺北市大安區');
    expect(location).toMatchObject({ county: '臺北市', township: '大安區', city: '臺北市大安區', latitude: 25.033, longitude: 121.5654 });
  });

  it('falls back to the global search for non-Taiwan places', async () => {
    mocks.netFetch.mockImplementation(async (url: string) => (new URL(url).searchParams.has('countryCode') ? reply([]) : reply([TOKYO])));
    const location = await resolveLocationByKeyword('Tokyo');
    expect(location).toMatchObject({ city: 'Tokyo', countryCode: 'JP' });
  });

  it('throws on empty input, HTTP errors, non-JSON bodies and no results', async () => {
    await expect(resolveLocationByKeyword('   ')).rejects.toThrow('请输入城市名称');
    expect(mocks.netFetch).not.toHaveBeenCalled();

    mocks.netFetch.mockResolvedValue({ ok: false, status: 503, body: 'down' });
    await expect(resolveLocationByKeyword('Nowhere')).rejects.toThrow(/503/);

    mocks.netFetch.mockResolvedValue({ ok: true, status: 200, body: '<html>' });
    await expect(resolveLocationByKeyword('Nowhere')).rejects.toThrow('非 JSON');

    mocks.netFetch.mockResolvedValue(reply([]));
    await expect(resolveLocationByKeyword('Nowhere')).rejects.toThrow('未查询到该城市');
  });
});

describe('resolveLocationByCoordinates', () => {
  it('fills Taiwan metadata offline while keeping the requested coordinates', async () => {
    await expect(resolveLocationByCoordinates(25.0141, 121.5341)).resolves.toMatchObject({
      latitude: 25.0141,
      longitude: 121.5341,
      county: '臺北市',
      countryCode: 'TW',
    });
    expect(mocks.netFetch).not.toHaveBeenCalled();
  });

  it.each([
    [35.68, 139.69],
    [Number.NaN, 121],
    [95, 121],
  ])('rejects (%f, %f)', async (lat, lon) => {
    await expect(resolveLocationByCoordinates(lat, lon)).rejects.toThrow();
  });
});
