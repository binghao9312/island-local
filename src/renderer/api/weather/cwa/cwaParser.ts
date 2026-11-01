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
 * @file cwaParser.ts
 * @description CWA 开放数据响应解析：测站观测（O-A0003-001）、鄉鎮 3 天逐 3 小时预报（F-D0047 奇数编号）、1 週预报（F-D0047 偶数编号）
 * @description 仅包含纯函数，不发起网络请求，便于使用夹具测试
 * @author 鸡哥
 */

import { approxDistanceSquared, normalizeTaiwanName } from './cwaCounties';

/** 任意 JSON 对象 */
type JsonRecord = Record<string, unknown>;

/** 当前观测摘要 */
export interface CwaObservation {
  /** 测站名称 */
  stationName: string;
  /** 气温（℃） */
  temperature: number;
  /** 相对湿度（0-100），缺测为 null */
  humidity: number | null;
  /** 风速（m/s），缺测为 null */
  windSpeed: number | null;
  /** 紫外线指数，缺测为 null */
  uvIndex: number | null;
  /** 天气现象文字，缺测为空字符串 */
  weather: string;
}

/** 鄉鎮 3 天预报中「当前时段」的摘要 */
export interface CwaCurrentForecast {
  /** 鄉鎮名称 */
  townshipName: string;
  /** 降雨机率（%），缺测为 null */
  precipitationProbability: number | null;
  /** 天气现象文字 */
  weather: string;
  /** 气温（℃），缺测为 null */
  temperature: number | null;
  /** 相对湿度，缺测为 null */
  humidity: number | null;
  /** 风速（m/s），缺测为 null */
  windSpeed: number | null;
}

/** 1 週预报中某一天的汇总 */
export interface CwaDailyForecast {
  /** 日期（台湾时间 YYYY-MM-DD） */
  date: string;
  /** 天气现象文字 */
  weather: string;
  /** 最高温（℃） */
  temperatureMax: number | null;
  /** 最低温（℃） */
  temperatureMin: number | null;
  /** 最高降雨机率（%） */
  precipitationProbability: number | null;
  /** 风速（m/s） */
  windSpeed: number | null;
  /** 紫外线指数 */
  uvIndex: number | null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** 读取对象字段，兼容新版（首字母大写）与旧版（小写）字段名 */
function field(obj: JsonRecord | null, ...names: string[]): unknown {
  if (!obj) return undefined;
  for (const name of names) {
    if (name in obj) return obj[name];
  }
  return undefined;
}

/**
 * 将 CWA 数值字段转换为有限数字；缺测值（-99 等）与非数字返回 null。
 * @param value - 原始字段值（字符串或数字）
 * @returns 有效数字或 null
 */
export function toCwaNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : (typeof value === 'string' && value.trim() !== '' ? Number(value.trim()) : Number.NaN);
  if (!Number.isFinite(parsed) || parsed <= -90) return null;
  return parsed;
}

function toText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text === '-99' || text === '-' ? '' : text;
}

/**
 * 将 CWA 天气现象文字映射为 WMO 天气代码（用于选择图标）。
 * @param text - 天气现象，例如「多雲時晴」「陣雨」「午後雷陣雨」
 * @returns WMO 天气代码
 */
export function mapCwaWeatherToWmoCode(text: string | undefined): number {
  const value = normalizeTaiwanName(text ?? '');
  if (!value) return 0;
  if (value.includes('雷')) return 95;
  if (value.includes('雪')) return 71;
  if (value.includes('雨')) {
    if (value.includes('豪') || value.includes('大雨')) return 65;
    if (value.includes('陣') || value.includes('短暫')) return 80;
    return 63;
  }
  if (value.includes('霧') || value.includes('霾')) return 45;
  if (value.includes('陰')) return 3;
  if (value.includes('多雲')) return value.includes('晴') ? 1 : 2;
  if (value.includes('晴')) return 0;
  return 0;
}

/**
 * 解析 O-A0003-001，返回距离给定坐标最近、且有有效气温的测站观测。
 * @param json - 接口 JSON
 * @param latitude - 目标纬度
 * @param longitude - 目标经度
 * @returns 最近测站的观测，没有可用测站返回 null
 */
export function parseNearestObservation(json: unknown, latitude: number, longitude: number): CwaObservation | null {
  const stations = asArray(field(asRecord(field(asRecord(json), 'records')), 'Station', 'station'));
  let best: { obs: CwaObservation; distance: number } | null = null;
  for (const raw of stations) {
    const station = asRecord(raw);
    const geo = asRecord(field(station, 'GeoInfo', 'geoInfo'));
    const coords = asArray(field(geo, 'Coordinates', 'coordinates')).map(asRecord);
    const wgs = coords.find((c) => field(c, 'CoordinateName') === 'WGS84') ?? coords[0] ?? null;
    const lat = toCwaNumber(field(wgs, 'StationLatitude'));
    const lon = toCwaNumber(field(wgs, 'StationLongitude'));
    const elements = asRecord(field(station, 'WeatherElement', 'weatherElement'));
    const temperature = toCwaNumber(field(elements, 'AirTemperature'));
    if (lat === null || lon === null || temperature === null) continue;
    const distance = approxDistanceSquared(latitude, longitude, lat, lon);
    if (best && best.distance <= distance) continue;
    const rawHumidity = toCwaNumber(field(elements, 'RelativeHumidity'));
    best = {
      distance,
      obs: {
        stationName: toText(field(station, 'StationName')),
        temperature,
        // 部分数据集以 0-1 小数表示湿度
        humidity: rawHumidity !== null && rawHumidity <= 1 ? rawHumidity * 100 : rawHumidity,
        windSpeed: toCwaNumber(field(elements, 'WindSpeed')),
        uvIndex: toCwaNumber(field(elements, 'UVIndex')),
        weather: toText(field(elements, 'Weather')),
      },
    };
  }
  return best ? best.obs : null;
}

/** 预报数据集中的一个鄉鎮及其要素 */
interface ForecastLocation {
  name: string;
  latitude: number | null;
  longitude: number | null;
  elements: Map<string, JsonRecord[]>;
}

function readForecastLocations(json: unknown): ForecastLocation[] {
  const records = asRecord(field(asRecord(json), 'records'));
  const group = asRecord(asArray(field(records, 'Locations', 'locations'))[0]);
  return asArray(field(group, 'Location', 'location')).flatMap((raw): ForecastLocation[] => {
    const location = asRecord(raw);
    if (!location) return [];
    const elements = new Map<string, JsonRecord[]>();
    for (const element of asArray(field(location, 'WeatherElement', 'weatherElement'))) {
      const row = asRecord(element);
      const name = toText(field(row, 'ElementName', 'elementName'));
      if (name) elements.set(name, asArray(field(row, 'Time', 'time')).flatMap((time): JsonRecord[] => { const record = asRecord(time); return record ? [record] : []; }));
    }
    return [{
      name: toText(field(location, 'LocationName', 'locationName')),
      latitude: toCwaNumber(field(location, 'Latitude', 'lat')),
      longitude: toCwaNumber(field(location, 'Longitude', 'lon')),
      elements,
    }];
  });
}

/**
 * 在预报数据集的鄉鎮列表中选择目标鄉鎮：优先名称匹配，其次按坐标就近。
 * @param locations - 解析后的鄉鎮列表
 * @param township - 期望的鄉鎮名称（可空）
 * @param latitude - 目标纬度
 * @param longitude - 目标经度
 * @returns 选中的鄉鎮，列表为空返回 null
 */
function pickLocation(locations: ForecastLocation[], township: string | undefined, latitude: number, longitude: number): ForecastLocation | null {
  if (locations.length === 0) return null;
  const wanted = normalizeTaiwanName(township ?? '');
  if (wanted) {
    const byName = locations.find((l) => normalizeTaiwanName(l.name) === wanted)
      ?? locations.find((l) => wanted.length >= 2 && normalizeTaiwanName(l.name).startsWith(wanted));
    if (byName) return byName;
  }
  return locations.reduce((best, current) => {
    if (current.latitude === null || current.longitude === null) return best;
    if (best.latitude === null || best.longitude === null) return current;
    return approxDistanceSquared(latitude, longitude, current.latitude, current.longitude)
      < approxDistanceSquared(latitude, longitude, best.latitude, best.longitude) ? current : best;
  });
}

/** 读取 ElementValue 数组首项中指定字段（旧版为 value） */
function elementValue(time: JsonRecord, key: string): unknown {
  const first = asRecord(asArray(field(time, 'ElementValue', 'elementValue'))[0]);
  if (!first) return undefined;
  return key in first ? first[key] : first.value;
}

function timeStart(time: JsonRecord): string {
  return toText(field(time, 'StartTime', 'DataTime', 'startTime', 'dataTime'));
}

function timeEnd(time: JsonRecord): string {
  return toText(field(time, 'EndTime', 'endTime')) || timeStart(time);
}

/**
 * 找到覆盖 now 的时间段；点状数据取不晚于 now 的最近一笔，找不到则取第一笔。
 * @param times - 要素的时间序列
 * @param now - 当前时间
 * @returns 命中的时间段
 */
function pickCurrentTime(times: JsonRecord[], now: Date): JsonRecord | null {
  const ms = now.getTime();
  const covering = times.find((time) => Date.parse(timeStart(time)) <= ms && ms < Date.parse(timeEnd(time)));
  if (covering) return covering;
  const past = times.filter((time) => Date.parse(timeStart(time)) <= ms);
  return past.length > 0 ? past[past.length - 1] : (times[0] ?? null);
}

/**
 * 解析 F-D0047（3 天逐 3 小时）预报，取目标鄉鎮当前时段的降雨机率、天气等。
 * @param json - 接口 JSON
 * @param township - 期望鄉鎮名称（可空，空则就近）
 * @param latitude - 目标纬度
 * @param longitude - 目标经度
 * @param now - 当前时间
 * @returns 当前时段摘要，没有鄉鎮数据返回 null
 */
export function parseCurrentForecast(json: unknown, township: string | undefined, latitude: number, longitude: number, now: Date): CwaCurrentForecast | null {
  const location = pickLocation(readForecastLocations(json), township, latitude, longitude);
  if (!location) return null;
  const read = (name: string, key: string): unknown => {
    const time = pickCurrentTime(location.elements.get(name) ?? [], now);
    return time ? elementValue(time, key) : undefined;
  };
  return {
    townshipName: location.name,
    precipitationProbability: toCwaNumber(read('3小時降雨機率', 'ProbabilityOfPrecipitation')),
    weather: toText(read('天氣現象', 'Weather')),
    temperature: toCwaNumber(read('溫度', 'Temperature')),
    humidity: toCwaNumber(read('相對濕度', 'RelativeHumidity')),
    windSpeed: toCwaNumber(read('風速', 'WindSpeed')),
  };
}

function maxOf(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  return b === null ? a : Math.max(a, b);
}

function minOf(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  return b === null ? a : Math.min(a, b);
}

/**
 * 解析 F-D0047（1 週，12 小时一段）预报，按台湾日期汇总每天的高低温、降雨机率等。
 * @param json - 接口 JSON
 * @param township - 期望鄉鎮名称（可空，空则就近）
 * @param latitude - 目标纬度
 * @param longitude - 目标经度
 * @returns 按日期升序的每日汇总，没有鄉鎮数据返回空数组
 */
export function parseDailyForecasts(json: unknown, township: string | undefined, latitude: number, longitude: number): CwaDailyForecast[] {
  const location = pickLocation(readForecastLocations(json), township, latitude, longitude);
  if (!location) return [];
  const days = new Map<string, CwaDailyForecast>();
  const weatherIsDaytime = new Map<string, boolean>();
  const dayOf = (time: JsonRecord): CwaDailyForecast | null => {
    const date = timeStart(time).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    let day = days.get(date);
    if (!day) {
      day = { date, weather: '', temperatureMax: null, temperatureMin: null, precipitationProbability: null, windSpeed: null, uvIndex: null };
      days.set(date, day);
    }
    return day;
  };

  for (const time of location.elements.get('最高溫度') ?? []) {
    const day = dayOf(time);
    if (day) day.temperatureMax = maxOf(day.temperatureMax, toCwaNumber(elementValue(time, 'MaxTemperature')));
  }
  for (const time of location.elements.get('最低溫度') ?? []) {
    const day = dayOf(time);
    if (day) day.temperatureMin = minOf(day.temperatureMin, toCwaNumber(elementValue(time, 'MinTemperature')));
  }
  for (const time of location.elements.get('12小時降雨機率') ?? []) {
    const day = dayOf(time);
    if (day) day.precipitationProbability = maxOf(day.precipitationProbability, toCwaNumber(elementValue(time, 'ProbabilityOfPrecipitation')));
  }
  for (const time of location.elements.get('風速') ?? []) {
    const day = dayOf(time);
    if (day) day.windSpeed = maxOf(day.windSpeed, toCwaNumber(elementValue(time, 'WindSpeed')));
  }
  for (const time of location.elements.get('紫外線指數') ?? []) {
    const day = dayOf(time);
    if (day) day.uvIndex = maxOf(day.uvIndex, toCwaNumber(elementValue(time, 'UVIndex')));
  }
  // 天气现象优先取白天（06:00-18:00 开始）的时段，否则取当天第一笔
  for (const time of location.elements.get('天氣現象') ?? []) {
    const day = dayOf(time);
    const text = toText(elementValue(time, 'Weather'));
    if (!day || !text) continue;
    const hour = Number(timeStart(time).slice(11, 13));
    const isDaytime = hour >= 6 && hour < 18;
    if (!day.weather || (isDaytime && !weatherIsDaytime.get(day.date))) {
      day.weather = text;
      weatherIsDaytime.set(day.date, isDaytime);
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
