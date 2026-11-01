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
 * @file cwaCounties.test.ts
 * @description CWA 縣市对照表：台/臺 与简繁体归一化、縣市名称匹配、数据集编号、就近匹配与台湾范围判断测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  CWA_COUNTIES,
  findCountyByName,
  findNearestCounty,
  isNearTaiwan,
  normalizeTaiwanName,
} from '../cwaCounties';

describe('normalizeTaiwanName', () => {
  it.each([
    ['台北市', '臺北市'],
    ['臺北市', '臺北市'],
    ['  台南  ', '臺南'],
    ['台东县', '臺東縣'],
    ['连江县', '連江縣'],
    ['嘉义市', '嘉義市'],
    ['新北市新店区', '新北市新店區'],
    ['宜兰县礁溪乡', '宜蘭縣礁溪鄉'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeTaiwanName(input)).toBe(expected);
  });
});

describe('findCountyByName', () => {
  it.each([
    ['台北', '臺北市'],
    ['台北市', '臺北市'],
    ['臺北市', '臺北市'],
    ['台中', '臺中市'],
    ['台南市', '臺南市'],
    ['臺東縣', '臺東縣'],
    ['台东', '臺東縣'],
    ['高雄', '高雄市'],
    ['新北', '新北市'],
    ['桃園', '桃園市'],
    ['新竹', '新竹市'],
    ['新竹縣', '新竹縣'],
    ['嘉義', '嘉義市'],
    ['嘉義縣', '嘉義縣'],
    ['台北市信義區', '臺北市'],
    ['新北市新店区', '新北市'],
    ['金门县', '金門縣'],
    ['连江', '連江縣'],
  ])('%s -> %s', (input, expected) => {
    expect(findCountyByName(input)?.name).toBe(expected);
  });

  it.each(['', '  ', '台', 'Tokyo', '東京', null, undefined])('returns null for %o', (input) => {
    expect(findCountyByName(input)).toBeNull();
  });
});

describe('CWA_COUNTIES dataset ids', () => {
  it('lists all 22 counties and cities with unique names', () => {
    expect(CWA_COUNTIES).toHaveLength(22);
    expect(new Set(CWA_COUNTIES.map((county) => county.name)).size).toBe(22);
  });

  it('uses the documented odd id for 3-day and the following even id for 1-week forecasts', () => {
    for (const county of CWA_COUNTIES) {
      const id = Number(county.forecast3d.replace('F-D0047-', ''));
      expect(county.forecast3d).toMatch(/^F-D0047-\d{3}$/);
      expect(id % 2).toBe(1);
      expect(county.forecastWeek).toBe(`F-D0047-${String(id + 2).padStart(3, '0')}`);
    }
  });

  it.each([
    ['臺北市', 'F-D0047-061', 'F-D0047-063'],
    ['新北市', 'F-D0047-069', 'F-D0047-071'],
    ['高雄市', 'F-D0047-065', 'F-D0047-067'],
    ['臺中市', 'F-D0047-073', 'F-D0047-075'],
    ['宜蘭縣', 'F-D0047-001', 'F-D0047-003'],
    ['連江縣', 'F-D0047-081', 'F-D0047-083'],
  ])('%s maps to %s / %s as listed in the CWA Swagger', (name, threeDay, week) => {
    const county = findCountyByName(name);
    expect(county?.forecast3d).toBe(threeDay);
    expect(county?.forecastWeek).toBe(week);
  });
});

describe('findNearestCounty and isNearTaiwan', () => {
  it('maps coordinates to the nearest county seat', () => {
    expect(findNearestCounty(25.03, 121.56).name).toBe('臺北市');
    expect(findNearestCounty(22.63, 120.3).name).toBe('高雄市');
    expect(findNearestCounty(24.45, 118.38).name).toBe('金門縣');
  });

  it.each([
    [25.033, 121.565],
    [22.63, 120.3],
    [24.45, 118.38],
    [26.15, 119.95],
    [23.57, 119.58],
  ])('(%f, %f) is within Taiwan coverage', (lat, lon) => {
    expect(isNearTaiwan(lat, lon)).toBe(true);
  });

  it.each([
    [35.68, 139.69],
    [39.9, 116.4],
    [22.3, 114.17],
    [0, 0],
  ])('(%f, %f) is outside Taiwan coverage', (lat, lon) => {
    expect(isNearTaiwan(lat, lon)).toBe(false);
  });
});
