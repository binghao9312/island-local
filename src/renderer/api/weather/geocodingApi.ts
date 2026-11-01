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
 * @file geocodingApi.ts
 * @description 城市名称到坐标的地理编码（Open-Meteo Geocoding，免 key），并映射为 CWA 縣市 / 鄉鎮市區
 * @author 鸡哥
 */

import { loadNetworkConfig } from '../../store/utils/storage';
import { logger } from '../../utils/logger';
import i18n from '../../i18n';
import {
  findCountyByName,
  findNearestCounty,
  isNearTaiwan,
  normalizeTaiwanName,
} from './cwa/cwaCounties';
import type { CwaCounty } from './cwa/cwaCounties';
import type { LocationInfo } from './types/LocationInfo';

/** Open-Meteo 地理编码单条结果（仅列出用到的字段） */
export interface GeocodingResult {
  /** 地点名称 */
  name?: string;
  /** 纬度 */
  latitude?: number;
  /** 经度 */
  longitude?: number;
  /** ISO 3166-1 alpha-2 国家代码 */
  country_code?: string;
  /** 国家名称 */
  country?: string;
  /** 一级行政区（台湾通常是无意义的「臺灣省 or 台灣省」） */
  admin1?: string;
  /** 二级行政区（台湾为縣市） */
  admin2?: string;
  /** 三级行政区（台湾为鄉鎮市區） */
  admin3?: string;
  /** GeoNames 地物类型 */
  feature_code?: string;
}

/** 地理编码解析后的位置 */
export interface ResolvedLocation {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 用于显示的城市名称 */
  city: string;
  /** ISO 国家代码 */
  countryCode?: string;
  /** 国家名称 */
  country?: string;
  /** 地区名称（台湾为縣市） */
  regionName?: string;
  /** CWA 縣市名称 */
  county?: string;
  /** CWA 鄉鎮市區名称 */
  township?: string;
}

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** 鄉鎮市區名称常见后缀 */
const TOWNSHIP_SUFFIX = /[區鄉鎮市]$/;

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 把「台」「臺」互换，用于两种写法都尝试一次 */
function swapTaiwanChar(text: string): string {
  if (text.includes('臺')) return text.replaceAll('臺', '台');
  return text.includes('台') ? text.replaceAll('台', '臺') : text;
}

/** 从文本中去掉縣市名称（含省略「市 / 縣」的简称），返回剩余部分 */
function stripCountyName(normalized: string, county: CwaCounty): string {
  const short = county.name.slice(0, -1);
  if (normalized.includes(county.name)) return normalized.replace(county.name, '').trim();
  if (normalized.startsWith(short)) return normalized.slice(short.length).trim();
  return normalized;
}

/**
 * 将 Open-Meteo 的台湾结果映射到 CWA 縣市 / 鄉鎮市區（admin2 / admin3，兼容 台/臺 与繁简写法）。
 * @param result - 单条地理编码结果
 * @returns 映射后的位置；缺少坐标时返回 null
 */
export function mapGeocodingResult(result: GeocodingResult): ResolvedLocation | null {
  const latitude = toFiniteNumber(result.latitude);
  const longitude = toFiniteNumber(result.longitude);
  if (latitude === null || longitude === null) return null;
  const name = (result.name ?? '').trim();
  const countryCode = (result.country_code ?? '').toUpperCase();
  const base: ResolvedLocation = {
    latitude,
    longitude,
    city: name,
    countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
    country: result.country,
    regionName: result.admin1,
  };
  if (countryCode !== 'TW') return base;

  const county = findCountyByName(result.admin2) ?? findCountyByName(name) ?? findNearestCounty(latitude, longitude);
  const admin3 = normalizeTaiwanName(result.admin3 ?? '');
  const normalizedName = normalizeTaiwanName(name);
  const township = admin3 || (TOWNSHIP_SUFFIX.test(normalizedName) && !findCountyByName(normalizedName) ? normalizedName : '');
  return {
    ...base,
    city: township ? `${county.name}${township}` : (findCountyByName(name) ? county.name : name),
    regionName: county.name,
    county: county.name,
    ...(township ? { township } : {}),
  };
}

/**
 * 从候选结果中选出最合适的一条：台湾结果优先；若指定縣市则优先同縣市；名称完全相同优先。
 * @param results - Open-Meteo 候选
 * @param keyword - 用户输入
 * @param county - 用户输入中包含的縣市（可空）
 * @returns 最佳映射结果，没有可用候选返回 null
 */
export function pickGeocodingResult(results: GeocodingResult[], keyword: string, county: CwaCounty | null): ResolvedLocation | null {
  const wanted = normalizeTaiwanName(keyword);
  const scored = results.flatMap((result, index) => {
    const mapped = mapGeocodingResult(result);
    if (!mapped) return [];
    const isTaiwan = mapped.countryCode === 'TW';
    const nameMatch = normalizeTaiwanName(result.name ?? '') === wanted || normalizeTaiwanName(result.admin3 ?? '') === wanted;
    const score = (isTaiwan ? 4 : 0) + (county && mapped.county === county.name ? 8 : 0) + (nameMatch ? 2 : 0);
    return [{ mapped, score, index }];
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0]?.mapped ?? null;
}

async function searchGeocoding(name: string, taiwanOnly: boolean): Promise<GeocodingResult[]> {
  const { timeoutMs } = loadNetworkConfig();
  const query = new URLSearchParams({ name, language: 'zh', count: '10', format: 'json' });
  if (taiwanOnly) query.set('countryCode', 'TW');
  const url = `${GEOCODING_URL}?${query.toString()}`;
  logger.info('[GeocodingApi] request', { url, timeoutMs });
  const resp = await window.api.netFetch(url, { timeoutMs });
  logger.info('[GeocodingApi] response', { status: resp.status, ok: resp.ok, size: resp.body.length });
  if (!resp.ok) {
    throw new Error(i18n.t('settings.weather.geocoding.httpError', {
      defaultValue: '地理编码服务 HTTP {{status}}：{{body}}',
      status: resp.status,
      body: resp.body.slice(0, 200),
    }));
  }
  let parsed: { results?: GeocodingResult[]; error?: boolean; reason?: string };
  try {
    parsed = JSON.parse(resp.body) as typeof parsed;
  } catch {
    throw new Error(i18n.t('settings.weather.geocoding.nonJson', { defaultValue: '地理编码服务返回了非 JSON 内容，请检查网络环境' }));
  }
  if (parsed.error) {
    throw new Error(parsed.reason || i18n.t('settings.weather.geocoding.notFound', { defaultValue: '未查询到该城市，请尝试更完整名称' }));
  }
  return Array.isArray(parsed.results) ? parsed.results : [];
}

/**
 * 通过城市关键字解析位置，并映射到 CWA 縣市 / 鄉鎮市區。
 * 縣市名称（台北、臺中市 等）直接使用本地对照表，其余走 Open-Meteo 地理编码。
 * @param keyword - 城市 / 地名，例如「台北」「新北市新店區」「高雄」
 * @returns 解析后的位置
 * @throws Error 输入为空、查无结果或网络失败时抛出
 */
export async function resolveLocationByKeyword(keyword: string): Promise<ResolvedLocation> {
  const text = keyword.trim();
  if (!text) throw new Error(i18n.t('settings.weather.geocoding.emptyKeyword', { defaultValue: '请输入城市名称' }));

  const normalized = normalizeTaiwanName(text);
  const county = findCountyByName(normalized);
  const rest = county ? stripCountyName(normalized, county) : '';

  if (county && !rest) {
    return {
      latitude: county.latitude,
      longitude: county.longitude,
      city: county.name,
      countryCode: 'TW',
      country: '台灣',
      regionName: county.name,
      county: county.name,
    };
  }

  const searchTerm = county ? rest : text;
  let results = await searchGeocoding(searchTerm, true);
  if (results.length === 0) results = await searchGeocoding(swapTaiwanChar(searchTerm), true);

  const picked = pickGeocodingResult(results, searchTerm, county);
  if (picked && (!county || picked.county === county.name)) return picked;

  if (county) {
    // 地理编码找不到该鄉鎮：沿用縣市代表点坐标，鄉鎮名称交给 CWA 预报按名称筛选。
    const township = rest;
    return {
      latitude: county.latitude,
      longitude: county.longitude,
      city: `${county.name}${township}`,
      countryCode: 'TW',
      country: '台灣',
      regionName: county.name,
      county: county.name,
      township,
    };
  }

  // 非台湾地点：仍返回坐标，天气会提示不在 CWA 覆盖范围。
  const global = pickGeocodingResult(await searchGeocoding(text, false), text, null);
  if (global) return global;
  throw new Error(i18n.t('settings.weather.geocoding.notFound', { defaultValue: '未查询到该城市，请尝试更完整名称' }));
}

/**
 * 根据坐标补齐台湾位置元数据（不发起网络请求）。
 * 仅当坐标位于台湾及离岛附近时成功，用于旧版自定义坐标缺少国家信息的补齐。
 * @param latitude - 自定义纬度
 * @param longitude - 自定义经度
 * @returns 保留请求坐标的 LocationInfo
 * @throws Error 坐标无效或不在台湾附近时抛出
 */
export function resolveLocationByCoordinates(latitude: number, longitude: number): Promise<LocationInfo> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return Promise.reject(new Error('Invalid custom location coordinates'));
  }
  if (!isNearTaiwan(latitude, longitude)) {
    return Promise.reject(new Error('Coordinates are outside the area covered by CWA'));
  }
  const county = findNearestCounty(latitude, longitude);
  return Promise.resolve({
    latitude,
    longitude,
    city: county.name,
    regionName: county.name,
    country: '台灣',
    countryCode: 'TW',
    county: county.name,
  });
}
