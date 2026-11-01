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
 * @file cwaFixtures.ts
 * @description CWA 开放数据响应夹具：按官方 Swagger 字段名构造的精简观测与预报 JSON（非真实线上数据）
 * @author 鸡哥
 */

/** 构造一个观测站 */
function station(name: string, id: string, lat: number, lon: number, weather: Record<string, unknown>, county = '臺北市', town = '中正區'): Record<string, unknown> {
  return {
    StationName: name,
    StationId: id,
    ObsTime: { DateTime: '2026-11-01T17:50:00+08:00' },
    GeoInfo: {
      Coordinates: [
        { CoordinateName: 'TWD67', StationLatitude: lat - 0.0015, StationLongitude: lon - 0.0008 },
        { CoordinateName: 'WGS84', StationLatitude: lat, StationLongitude: lon },
      ],
      StationAltitude: '5.3',
      CountyName: county,
      TownName: town,
    },
    WeatherElement: weather,
  };
}

/** O-A0003-001：三个测站，最近的一个气温缺测（-99） */
export const OBSERVATION_FIXTURE = {
  success: 'true',
  records: {
    Station: [
      station('臺北', '466920', 25.0377, 121.5149, { Weather: '多雲', AirTemperature: '24.6', RelativeHumidity: '71', WindSpeed: '3.4', UVIndex: '0.0' }),
      station('鞍部', '466910', 25.1826, 121.5297, { Weather: '陰', AirTemperature: '18.2', RelativeHumidity: '93', WindSpeed: '8.1', UVIndex: '-99' }, '臺北市', '北投區'),
      // 距离最近但气温缺测，必须被跳过
      station('公館', 'C0A9F0', 25.0140, 121.5340, { Weather: '-99', AirTemperature: '-99.0', RelativeHumidity: '-99', WindSpeed: '-99' }),
      station('高雄', '467440', 22.5661, 120.3159, { Weather: '晴', AirTemperature: '30.1', RelativeHumidity: '60', WindSpeed: '2.0', UVIndex: '6.0' }, '高雄市', '前鎮區'),
    ],
  },
};

/** 构造 3 小时降雨机率等点状 / 区间时间项 */
function point(time: string, value: Record<string, string>): Record<string, unknown> {
  return { DataTime: time, ElementValue: [value] };
}

function range(start: string, end: string, value: Record<string, string>): Record<string, unknown> {
  return { StartTime: start, EndTime: end, ElementValue: [value] };
}

/** 构造一个鄉鎮的 3 天逐 3 小时预报 */
function threeDayTownship(name: string, lat: number, lon: number, rain: [string, string], temp: [string, string]): Record<string, unknown> {
  return {
    LocationName: name,
    Geocode: '63000010',
    Latitude: String(lat),
    Longitude: String(lon),
    WeatherElement: [
      { ElementName: '溫度', Time: [point('2026-11-01T15:00:00+08:00', { Temperature: temp[0] }), point('2026-11-01T18:00:00+08:00', { Temperature: temp[1] })] },
      { ElementName: '相對濕度', Time: [point('2026-11-01T15:00:00+08:00', { RelativeHumidity: '70' }), point('2026-11-01T18:00:00+08:00', { RelativeHumidity: '75' })] },
      {
        ElementName: '3小時降雨機率',
        Time: [
          range('2026-11-01T15:00:00+08:00', '2026-11-01T18:00:00+08:00', { ProbabilityOfPrecipitation: rain[0] }),
          range('2026-11-01T18:00:00+08:00', '2026-11-01T21:00:00+08:00', { ProbabilityOfPrecipitation: rain[1] }),
        ],
      },
      { ElementName: '風速', Time: [point('2026-11-01T15:00:00+08:00', { WindSpeed: '2', BeaufortScale: '2' }), point('2026-11-01T18:00:00+08:00', { WindSpeed: '4', BeaufortScale: '3' })] },
      { ElementName: '天氣現象', Time: [point('2026-11-01T15:00:00+08:00', { Weather: '多雲', WeatherCode: '04' }), point('2026-11-01T18:00:00+08:00', { Weather: '陰短暫雨', WeatherCode: '08' })] },
    ],
  };
}

/** F-D0047-061：臺北市 3 天逐 3 小时，两个鄉鎮（大安區、士林區） */
export const FORECAST_3D_FIXTURE = {
  success: 'true',
  records: {
    Locations: [{
      DatasetDescription: '臺灣各縣市鄉鎮未來3天(72小時)逐3小時天氣預報',
      LocationsName: '臺北市',
      Dataid: 'D0047-061',
      Location: [
        threeDayTownship('大安區', 25.026, 121.543, ['20', '60'], ['25', '24']),
        threeDayTownship('士林區', 25.092, 121.526, ['-', '-'], ['22', '21']),
      ],
    }],
  },
};

/** 构造一个鄉鎮的 1 週预报（12 小时一段，白天 06:00 / 夜间 18:00） */
function weeklyTownship(name: string, lat: number, lon: number): Record<string, unknown> {
  const day = (date: string, hour: '06' | '18', end: string, value: Record<string, string>): Record<string, unknown> =>
    range(`${date}T${hour}:00:00+08:00`, end, value);
  const periods: Array<[string, '06' | '18', string]> = [
    ['2026-11-01', '18', '2026-11-02T06:00:00+08:00'],
    ['2026-11-02', '06', '2026-11-02T18:00:00+08:00'],
    ['2026-11-02', '18', '2026-11-03T06:00:00+08:00'],
    ['2026-11-03', '06', '2026-11-03T18:00:00+08:00'],
    ['2026-11-03', '18', '2026-11-04T06:00:00+08:00'],
  ];
  const maxTemps = ['25', '27', '23', '29', '24'];
  const minTemps = ['21', '22', '20', '24', '21'];
  const rain = ['40', '30', '50', '10', '-'];
  const wind = ['2', '3', '5', '2', '1'];
  const weather: Array<[string, string]> = [['陰短暫雨', '08'], ['多雲時陰', '05'], ['陣雨', '15'], ['晴時多雲', '02'], ['晴', '01']];
  return {
    LocationName: name,
    Geocode: '63000010',
    Latitude: String(lat),
    Longitude: String(lon),
    WeatherElement: [
      { ElementName: '最高溫度', Time: periods.map(([d, h, e], i) => day(d, h, e, { MaxTemperature: maxTemps[i] })) },
      { ElementName: '最低溫度', Time: periods.map(([d, h, e], i) => day(d, h, e, { MinTemperature: minTemps[i] })) },
      { ElementName: '12小時降雨機率', Time: periods.map(([d, h, e], i) => day(d, h, e, { ProbabilityOfPrecipitation: rain[i] })) },
      { ElementName: '風速', Time: periods.map(([d, h, e], i) => day(d, h, e, { WindSpeed: wind[i], BeaufortScale: '2' })) },
      { ElementName: '天氣現象', Time: periods.map(([d, h, e], i) => day(d, h, e, { Weather: weather[i][0], WeatherCode: weather[i][1] })) },
      { ElementName: '紫外線指數', Time: periods.filter(([, h]) => h === '06').map(([d, h, e], i) => day(d, h, e, { UVIndex: ['7', '3'][i], UVExposureLevel: '高量級' })) },
    ],
  };
}

/** F-D0047-063：臺北市 1 週预报，两个鄉鎮 */
export const FORECAST_WEEK_FIXTURE = {
  success: 'true',
  records: {
    Locations: [{
      DatasetDescription: '臺灣各縣市鄉鎮未來1週天氣預報',
      LocationsName: '臺北市',
      Dataid: 'D0047-063',
      Location: [weeklyTownship('大安區', 25.026, 121.543), weeklyTownship('士林區', 25.092, 121.526)],
    }],
  },
};

/** 没有任何鄉鎮的空预报（用于测试鄉鎮名称筛选失败的退回） */
export const EMPTY_FORECAST_FIXTURE = { success: 'true', records: { Locations: [{ LocationsName: '臺北市', Location: [] }] } };
