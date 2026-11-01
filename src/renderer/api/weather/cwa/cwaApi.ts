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
 * @file cwaApi.ts
 * @description 中央气象署（CWA）开放数据天气接口
 * @description 当前观测使用 O-A0003-001（10 分钟综观观测，取最近测站），预报使用 F-D0047 鄉鎮天氣預報（3 天逐 3 小时 + 1 週）
 * @author 鸡哥
 */

import type { DayForecast, WeatherData } from '../../../store/types';
import { loadCwaApiKey, loadNetworkConfig } from '../../../store/utils/storage';
import { logger } from '../../../utils/logger';
import type { WeatherApiConfig } from '../types/WeatherApiConfig';
import { findCountyByName, findNearestCounty, isNearTaiwan, normalizeTaiwanName } from './cwaCounties';
import type { CwaCounty } from './cwaCounties';
import {
  mapCwaWeatherToWmoCode,
  parseCurrentForecast,
  parseDailyForecasts,
  parseNearestObservation,
} from './cwaParser';
import type { CwaCurrentForecast, CwaDailyForecast, CwaObservation } from './cwaParser';

/** CWA 开放数据 datastore 基础地址 */
const CWA_DATASTORE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

/** 10 分钟综观气象观测数据集 */
const OBSERVATION_DATASET = 'O-A0003-001';

/** 台湾时区相对 UTC 的毫秒偏移（UTC+8，无夏令时） */
const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000;

/** CWA 天气错误类型 */
export type CwaErrorCode = 'no-key' | 'invalid-key' | 'out-of-region' | 'network' | 'invalid-response';

/** CWA 天气请求错误，`code` 供 UI 区分空状态与提示 */
export class CwaError extends Error {
  /** 错误类型 */
  readonly code: CwaErrorCode;

  /**
   * 创建 CWA 错误
   * @param code - 错误类型
   * @param message - 错误描述
   */
  constructor(code: CwaErrorCode, message: string) {
    super(message);
    this.name = 'CwaError';
    this.code = code;
  }
}

/** 组装 buildWeatherData 的输入 */
export interface CwaWeatherParts {
  /** 最近测站观测 */
  observation: CwaObservation | null;
  /** 当前时段预报 */
  current: CwaCurrentForecast | null;
  /** 每日预报汇总 */
  daily: CwaDailyForecast[];
  /** 当前时间 */
  now: Date;
}

/**
 * 获取台湾时区的日期字符串
 * @param date - 时间点
 * @returns YYYY-MM-DD
 */
export function taiwanDateString(date: Date): string {
  return new Date(date.getTime() + TAIWAN_OFFSET_MS).toISOString().slice(0, 10);
}

function roundOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' ? Math.round(value) : fallback;
}

/**
 * 将解析后的观测与预报组装为应用内部的 WeatherData。
 * @param parts - 观测、当前时段预报、每日预报
 * @returns WeatherData（forecast 为明天与后天）
 * @throws CwaError 观测和预报都没有可用气温时抛出 invalid-response
 */
export function buildWeatherData(parts: CwaWeatherParts): WeatherData {
  const { observation, current, daily, now } = parts;
  const today = taiwanDateString(now);
  const todayDaily = daily.find((day) => day.date === today);
  const temperatureValue = observation?.temperature ?? current?.temperature;
  if (typeof temperatureValue !== 'number') {
    throw new CwaError('invalid-response', 'CWA response has no usable temperature');
  }
  const temperature = Math.round(temperatureValue);
  const description = observation?.weather || current?.weather || todayDaily?.weather || '';
  const windValue = observation?.windSpeed ?? current?.windSpeed ?? null;

  const upcoming = daily.filter((day) => day.date > today);
  const makeForecast = (day: CwaDailyForecast | undefined): DayForecast => {
    const temperatureMax = roundOr(day?.temperatureMax ?? day?.temperatureMin, temperature);
    const temperatureMin = roundOr(day?.temperatureMin ?? day?.temperatureMax, temperature);
    const text = day?.weather || description;
    return {
      temperature: Math.round((temperatureMax + temperatureMin) / 2),
      description: text,
      temperatureMax,
      temperatureMin,
      windSpeed: day?.windSpeed === null || day?.windSpeed === undefined ? -1 : Math.round(day.windSpeed),
      uvIndex: roundOr(day?.uvIndex, 0),
      precipitationProbability: roundOr(day?.precipitationProbability, -1),
      iconCode: mapCwaWeatherToWmoCode(text),
    };
  };

  return {
    temperature,
    description,
    humidity: roundOr(observation?.humidity ?? current?.humidity, 0),
    windSpeed: windValue === null ? 0 : Math.round(windValue * 10) / 10,
    uvIndex: roundOr(observation?.uvIndex ?? todayDaily?.uvIndex, 0),
    precipitationProbability: roundOr(current?.precipitationProbability ?? todayDaily?.precipitationProbability, -1),
    iconCode: mapCwaWeatherToWmoCode(description),
    forecast: [makeForecast(upcoming[0]), makeForecast(upcoming[1])],
  };
}

/**
 * 确定目标縣市：优先使用显式縣市，其次尝试城市名，最后按坐标就近；明确不在台湾时抛出 out-of-region。
 * @param config - 天气接口配置
 * @returns 对应的 CWA 縣市
 * @throws CwaError 位置不在 CWA 覆盖范围时抛出 out-of-region
 */
export function resolveCwaCounty(config: WeatherApiConfig): CwaCounty {
  const byName = findCountyByName(config.county);
  if (byName) return byName;
  const countryCode = config.countryCode?.trim().toUpperCase();
  if (countryCode && countryCode !== 'TW') {
    throw new CwaError('out-of-region', `CWA only covers Taiwan (country ${countryCode})`);
  }
  const byCity = findCountyByName(config.city);
  if (byCity) return byCity;
  if (!isNearTaiwan(config.latitude, config.longitude)) {
    throw new CwaError('out-of-region', 'Location is outside the area covered by CWA');
  }
  return findNearestCounty(config.latitude, config.longitude);
}

/**
 * 选择用于过滤预报数据集的鄉鎮名称：优先显式鄉鎮；城市名本身是縣市时不能当作鄉鎮。
 * @param config - 天气接口配置
 * @returns 归一化后的鄉鎮名称，没有候选时返回 undefined
 */
function pickTownshipName(config: WeatherApiConfig): string | undefined {
  const explicit = config.township?.trim();
  if (explicit) return normalizeTaiwanName(explicit);
  const city = config.city?.trim();
  return city && !findCountyByName(city) ? normalizeTaiwanName(city) : undefined;
}

/**
 * 请求 CWA datastore 并返回 JSON；授权码仅放在 query 中，不写入日志。
 * @param dataset - 数据集编号
 * @param apiKey - 授权码
 * @param params - 额外的查询参数
 * @returns 解析后的 JSON
 * @throws CwaError 授权码无效、网络失败或响应不是 JSON 时抛出
 */
async function requestDataset(dataset: string, apiKey: string, params: Record<string, string>): Promise<unknown> {
  const query = new URLSearchParams({ Authorization: apiKey, format: 'JSON', ...params });
  const url = `${CWA_DATASTORE_URL}/${dataset}?${query.toString()}`;
  const { timeoutMs } = loadNetworkConfig();
  const startedAt = Date.now();
  const resp = await window.api.netFetch(url, { timeoutMs });
  logger.info('[CwaApi] request:end', {
    dataset,
    status: resp.status,
    ok: resp.ok,
    durationMs: Date.now() - startedAt,
    responseSize: resp.body.length,
  });
  if (resp.status === 401 || resp.status === 403) {
    throw new CwaError('invalid-key', `CWA ${dataset} HTTP ${resp.status}: authorization key rejected`);
  }
  if (!resp.ok) {
    throw new CwaError('network', `CWA ${dataset} HTTP ${resp.status}`);
  }
  try {
    return JSON.parse(resp.body) as unknown;
  } catch {
    throw new CwaError('invalid-response', `CWA ${dataset} returned non-JSON content`);
  }
}

/**
 * 请求一个鄉鎮预报数据集；指定鄉鎮但查无结果时，退回请求整个縣市并按坐标就近选取。
 * @param dataset - 预报数据集编号
 * @param apiKey - 授权码
 * @param elementNames - 需要的天气要素（中文名称）
 * @param township - 鄉鎮名称（可空）
 * @returns 预报 JSON 与实际使用的鄉鎮名称过滤（退回时为空）
 */
async function requestForecast(dataset: string, apiKey: string, elementNames: string[], township: string | undefined): Promise<{ json: unknown; township: string | undefined }> {
  const base = { ElementName: elementNames.join(','), sort: 'time' };
  if (township) {
    const json = await requestDataset(dataset, apiKey, { ...base, LocationName: township });
    if (parseCurrentForecast(json, township, 0, 0, new Date()) !== null || parseDailyForecasts(json, township, 0, 0).length > 0) {
      return { json, township };
    }
  }
  return { json: await requestDataset(dataset, apiKey, base), township: undefined };
}

/**
 * 根据位置获取 CWA 天气：最近测站观测 + 鄉鎮预报。
 * @param config - 位置配置（经纬度，可附带縣市 / 鄉鎮）
 * @returns WeatherData
 * @throws CwaError 未设置授权码、授权码无效、位置不在台湾或请求失败时抛出
 */
export async function fetchCwaWeather(config: WeatherApiConfig): Promise<WeatherData> {
  const apiKey = loadCwaApiKey();
  if (!apiKey) {
    throw new CwaError('no-key', 'CWA API key is not configured');
  }
  const county = resolveCwaCounty(config);
  const now = new Date();
  const township = pickTownshipName(config);

  const [observationJson, current3d, currentWeek] = await Promise.all([
    requestDataset(OBSERVATION_DATASET, apiKey, {
      WeatherElement: 'Weather,AirTemperature,RelativeHumidity,WindSpeed,UVIndex',
      GeoInfo: 'Coordinates,CountyName,TownName',
    }),
    requestForecast(county.forecast3d, apiKey, ['溫度', '相對濕度', '3小時降雨機率', '風速', '天氣現象'], township),
    requestForecast(county.forecastWeek, apiKey, ['最高溫度', '最低溫度', '12小時降雨機率', '風速', '天氣現象', '紫外線指數'], township),
  ]);

  const weather = buildWeatherData({
    observation: parseNearestObservation(observationJson, config.latitude, config.longitude),
    current: parseCurrentForecast(current3d.json, current3d.township, config.latitude, config.longitude, now),
    daily: parseDailyForecasts(currentWeek.json, currentWeek.township, config.latitude, config.longitude),
    now,
  });
  logger.info('[CwaApi] 天气获取成功:', weather.description, `${weather.temperature}°C`, { county: county.name });
  return weather;
}
