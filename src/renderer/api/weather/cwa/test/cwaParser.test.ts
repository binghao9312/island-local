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
 * @file cwaParser.test.ts
 * @description CWA 响应解析：使用文档字段名夹具验证观测最近测站、当前时段预报、每日汇总与天气代码映射
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  mapCwaWeatherToWmoCode,
  parseCurrentForecast,
  parseDailyForecasts,
  parseNearestObservation,
  toCwaNumber,
} from '../cwaParser';
import { FORECAST_3D_FIXTURE, FORECAST_WEEK_FIXTURE, OBSERVATION_FIXTURE } from './cwaFixtures';

/** 台北时间 2026-11-01 16:30，落在 15:00-18:00 的 3 小时时段内 */
const NOW = new Date('2026-11-01T16:30:00+08:00');

describe('toCwaNumber', () => {
  it.each([
    ['24.6', 24.6],
    [3, 3],
    [' 7 ', 7],
    ['0', 0],
    ['-3.5', -3.5],
  ])('parses %o', (input, expected) => {
    expect(toCwaNumber(input)).toBe(expected);
  });

  it.each(['-99', '-99.0', -99, '-', '', 'abc', null, undefined, Number.NaN, {}])('treats %o as missing', (input) => {
    expect(toCwaNumber(input)).toBeNull();
  });
});

describe('mapCwaWeatherToWmoCode', () => {
  it.each([
    ['晴', 0],
    ['晴時多雲', 1],
    ['多雲時晴', 1],
    ['多雲', 2],
    ['多云', 2],
    ['陰', 3],
    ['多雲時陰', 3],
    ['陰時多雲', 3],
    ['霧', 45],
    ['陣雨', 80],
    ['陰短暫雨', 80],
    ['多雲短暫陣雨', 80],
    ['陰雨', 63],
    ['大雨', 65],
    ['豪雨', 65],
    ['午後雷陣雨', 95],
    ['陰有雨並伴隨雷', 95],
    ['下雪', 71],
    ['', 0],
    [undefined, 0],
    ['未知現象', 0],
  ])('%s -> %i', (text, code) => {
    expect(mapCwaWeatherToWmoCode(text)).toBe(code);
  });
});

describe('parseNearestObservation', () => {
  it('picks the nearest station that has a valid temperature, skipping missing (-99) readings', () => {
    const obs = parseNearestObservation(OBSERVATION_FIXTURE, 25.0141, 121.5341);
    expect(obs).toEqual({
      stationName: '臺北',
      temperature: 24.6,
      humidity: 71,
      windSpeed: 3.4,
      uvIndex: 0,
      weather: '多雲',
    });
  });

  it('picks a far-away station for a far-away point and maps missing optional fields to null', () => {
    const north = parseNearestObservation(OBSERVATION_FIXTURE, 25.18, 121.53);
    expect(north).toMatchObject({ stationName: '鞍部', temperature: 18.2, humidity: 93, windSpeed: 8.1, uvIndex: null, weather: '陰' });
    expect(parseNearestObservation(OBSERVATION_FIXTURE, 22.6, 120.3)?.stationName).toBe('高雄');
  });

  it('converts fractional humidity to a percentage', () => {
    const json = { records: { Station: [{ StationName: 'X', GeoInfo: { Coordinates: [{ CoordinateName: 'WGS84', StationLatitude: 25, StationLongitude: 121 }] }, WeatherElement: { AirTemperature: '20', RelativeHumidity: '0.82' } }] } };
    expect(parseNearestObservation(json, 25, 121)?.humidity).toBeCloseTo(82);
  });

  it.each([null, undefined, {}, { records: {} }, { records: { Station: [] } }, { records: { Station: [null, 'x', { StationName: 'No coordinates', WeatherElement: { AirTemperature: '20' } }] } }])('returns null for unusable payload %o', (json) => {
    expect(parseNearestObservation(json, 25, 121)).toBeNull();
  });
});

describe('parseCurrentForecast', () => {
  it('selects the named township and the 3-hour slot covering now', () => {
    expect(parseCurrentForecast(FORECAST_3D_FIXTURE, '大安區', 0, 0, NOW)).toEqual({
      townshipName: '大安區',
      precipitationProbability: 20,
      weather: '多雲',
      temperature: 25,
      humidity: 70,
      windSpeed: 2,
    });
  });

  it('uses the next slot once the first one has ended', () => {
    const later = new Date('2026-11-01T19:10:00+08:00');
    const result = parseCurrentForecast(FORECAST_3D_FIXTURE, '大安區', 0, 0, later);
    expect(result).toMatchObject({ precipitationProbability: 60, weather: '陰短暫雨', temperature: 24, windSpeed: 4 });
  });

  it('reports a missing rain probability ("-") as null', () => {
    expect(parseCurrentForecast(FORECAST_3D_FIXTURE, '士林區', 0, 0, NOW)?.precipitationProbability).toBeNull();
  });

  it('matches township names regardless of the 台/臺 and simplified variants', () => {
    expect(parseCurrentForecast(FORECAST_3D_FIXTURE, '士林区', 0, 0, NOW)?.townshipName).toBe('士林區');
  });

  it('falls back to the nearest township by coordinates when the name is unknown', () => {
    expect(parseCurrentForecast(FORECAST_3D_FIXTURE, undefined, 25.09, 121.52, NOW)?.townshipName).toBe('士林區');
    expect(parseCurrentForecast(FORECAST_3D_FIXTURE, '不存在區', 25.025, 121.54, NOW)?.townshipName).toBe('大安區');
  });

  it.each([null, {}, { records: { Locations: [] } }, { records: { Locations: [{ Location: [] }] } }])('returns null without townships: %o', (json) => {
    expect(parseCurrentForecast(json, '大安區', 25, 121, NOW)).toBeNull();
  });

  it('also reads the legacy lowercase schema', () => {
    const legacy = {
      records: {
        locations: [{
          location: [{
            locationName: '大安區',
            weatherElement: [{ elementName: '3小時降雨機率', time: [{ startTime: '2026-11-01T15:00:00+08:00', endTime: '2026-11-01T18:00:00+08:00', elementValue: [{ value: '45', measures: '百分比' }] }] }],
          }],
        }],
      },
    };
    expect(parseCurrentForecast(legacy, '大安區', 0, 0, NOW)?.precipitationProbability).toBe(45);
  });
});

describe('parseDailyForecasts', () => {
  const days = parseDailyForecasts(FORECAST_WEEK_FIXTURE, '大安區', 0, 0);

  it('groups 12-hour periods by Taiwan date in ascending order', () => {
    expect(days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('aggregates max/min temperature, max rain probability, max wind and UV per day', () => {
    expect(days[1]).toMatchObject({ date: '2026-11-02', temperatureMax: 27, temperatureMin: 20, precipitationProbability: 50, windSpeed: 5, uvIndex: 7 });
    expect(days[2]).toMatchObject({ date: '2026-11-03', temperatureMax: 29, temperatureMin: 21, precipitationProbability: 10, windSpeed: 2, uvIndex: 3 });
  });

  it('prefers the daytime period weather over the night period', () => {
    expect(days[1].weather).toBe('多雲時陰');
    expect(days[2].weather).toBe('晴時多雲');
    // 只有夜间时段的日期取夜间天气
    expect(days[0].weather).toBe('陰短暫雨');
  });

  it('treats an unavailable rain probability as null', () => {
    const json = { records: { Locations: [{ Location: [{ LocationName: '大安區', WeatherElement: [{ ElementName: '12小時降雨機率', Time: [{ StartTime: '2026-11-02T06:00:00+08:00', EndTime: '2026-11-02T18:00:00+08:00', ElementValue: [{ ProbabilityOfPrecipitation: '-' }] }] }] }] }] } };
    expect(parseDailyForecasts(json, '大安區', 0, 0)[0].precipitationProbability).toBeNull();
  });

  it.each([null, {}, { records: { Locations: [{ Location: [] }] } }])('returns an empty list for %o', (json) => {
    expect(parseDailyForecasts(json, '大安區', 0, 0)).toEqual([]);
  });
});
