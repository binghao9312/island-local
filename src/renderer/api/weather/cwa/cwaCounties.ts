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
 * @file cwaCounties.ts
 * @description 中央气象署（CWA）縣市对照表
 * @description 提供縣市预报数据集编号、代表坐标，以及台/臺、简繁体名称归一化与就近縣市匹配
 * @author 鸡哥
 */

/** CWA 縣市条目 */
export interface CwaCounty {
  /** 官方縣市名称（使用「臺」字） */
  name: string;
  /** 鄉鎮天氣預報 未來 3 天（逐 3 小時）数据集编号 */
  forecast3d: string;
  /** 鄉鎮天氣預報 未來 1 週数据集编号 */
  forecastWeek: string;
  /** 代表点纬度（縣市政府所在地附近） */
  latitude: number;
  /** 代表点经度（縣市政府所在地附近） */
  longitude: number;
}

/**
 * 全台 22 縣市。
 * 数据集编号来自 CWA 开放数据 Swagger：3 天为奇数序号，1 週为其后 +2。
 * 「新竹市 / 嘉義市」排在「新竹縣 / 嘉義縣」之前，使「新竹」「嘉義」这类简称优先匹配市。
 */
export const CWA_COUNTIES: readonly CwaCounty[] = [
  { name: '臺北市', forecast3d: 'F-D0047-061', forecastWeek: 'F-D0047-063', latitude: 25.033, longitude: 121.5654 },
  { name: '新北市', forecast3d: 'F-D0047-069', forecastWeek: 'F-D0047-071', latitude: 25.012, longitude: 121.4657 },
  { name: '基隆市', forecast3d: 'F-D0047-049', forecastWeek: 'F-D0047-051', latitude: 25.1276, longitude: 121.7392 },
  { name: '桃園市', forecast3d: 'F-D0047-005', forecastWeek: 'F-D0047-007', latitude: 24.9937, longitude: 121.301 },
  { name: '新竹市', forecast3d: 'F-D0047-053', forecastWeek: 'F-D0047-055', latitude: 24.8138, longitude: 120.9675 },
  { name: '新竹縣', forecast3d: 'F-D0047-009', forecastWeek: 'F-D0047-011', latitude: 24.8387, longitude: 121.0177 },
  { name: '苗栗縣', forecast3d: 'F-D0047-013', forecastWeek: 'F-D0047-015', latitude: 24.5602, longitude: 120.8214 },
  { name: '臺中市', forecast3d: 'F-D0047-073', forecastWeek: 'F-D0047-075', latitude: 24.1477, longitude: 120.6736 },
  { name: '彰化縣', forecast3d: 'F-D0047-017', forecastWeek: 'F-D0047-019', latitude: 24.0518, longitude: 120.5161 },
  { name: '南投縣', forecast3d: 'F-D0047-021', forecastWeek: 'F-D0047-023', latitude: 23.9157, longitude: 120.6639 },
  { name: '雲林縣', forecast3d: 'F-D0047-025', forecastWeek: 'F-D0047-027', latitude: 23.7092, longitude: 120.4313 },
  { name: '嘉義市', forecast3d: 'F-D0047-057', forecastWeek: 'F-D0047-059', latitude: 23.4801, longitude: 120.4491 },
  { name: '嘉義縣', forecast3d: 'F-D0047-029', forecastWeek: 'F-D0047-031', latitude: 23.4518, longitude: 120.2555 },
  { name: '臺南市', forecast3d: 'F-D0047-077', forecastWeek: 'F-D0047-079', latitude: 22.9999, longitude: 120.227 },
  { name: '高雄市', forecast3d: 'F-D0047-065', forecastWeek: 'F-D0047-067', latitude: 22.6273, longitude: 120.3014 },
  { name: '屏東縣', forecast3d: 'F-D0047-033', forecastWeek: 'F-D0047-035', latitude: 22.5519, longitude: 120.5487 },
  { name: '宜蘭縣', forecast3d: 'F-D0047-001', forecastWeek: 'F-D0047-003', latitude: 24.7021, longitude: 121.7378 },
  { name: '花蓮縣', forecast3d: 'F-D0047-041', forecastWeek: 'F-D0047-043', latitude: 23.9871, longitude: 121.6015 },
  { name: '臺東縣', forecast3d: 'F-D0047-037', forecastWeek: 'F-D0047-039', latitude: 22.7583, longitude: 121.1444 },
  { name: '澎湖縣', forecast3d: 'F-D0047-045', forecastWeek: 'F-D0047-047', latitude: 23.5711, longitude: 119.5793 },
  { name: '金門縣', forecast3d: 'F-D0047-085', forecastWeek: 'F-D0047-087', latitude: 24.4493, longitude: 118.3767 },
  { name: '連江縣', forecast3d: 'F-D0047-081', forecastWeek: 'F-D0047-083', latitude: 26.1505, longitude: 119.9499 },
];

/** 简体到繁体的常见縣市 / 鄉鎮用字映射 */
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  县: '縣',
  东: '東',
  门: '門',
  连: '連',
  义: '義',
  兰: '蘭',
  园: '園',
  莲: '蓮',
  云: '雲',
  湾: '灣',
  区: '區',
  乡: '鄉',
  镇: '鎮',
  盘: '盤',
  龙: '龍',
  凤: '鳳',
  冈: '岡',
  岛: '島',
  台: '臺',
};

/**
 * 归一化台湾地名：简体转繁体常用字，并统一「台 / 臺」为「臺」。
 * @param text - 原始地名
 * @returns 去除首尾空白并归一化后的地名
 */
export function normalizeTaiwanName(text: string): string {
  return [...text.trim()].map((ch) => SIMPLIFIED_TO_TRADITIONAL[ch] ?? ch).join('');
}

/**
 * 按名称匹配 CWA 縣市，支持 台/臺、简繁体、省略「市/縣」的简称，以及包含鄉鎮区的完整地址。
 * @param text - 待匹配文本，例如「台北」「臺北市信義區」
 * @returns 匹配到的縣市，找不到返回 null
 */
export function findCountyByName(text: string | undefined | null): CwaCounty | null {
  const normalized = normalizeTaiwanName(text ?? '');
  if (normalized.length < 2) return null;
  const exact = CWA_COUNTIES.find((county) => county.name === normalized);
  if (exact) return exact;
  const contained = CWA_COUNTIES.find((county) => normalized.includes(county.name));
  if (contained) return contained;
  return CWA_COUNTIES.find((county) => county.name.startsWith(normalized)) ?? null;
}

/**
 * 计算两个经纬度之间的近似平面距离平方（仅用于就近比较）。
 * @param latA - 点 A 纬度
 * @param lonA - 点 A 经度
 * @param latB - 点 B 纬度
 * @param lonB - 点 B 经度
 * @returns 距离平方（度²，经度按纬度余弦缩放）
 */
export function approxDistanceSquared(latA: number, lonA: number, latB: number, lonB: number): number {
  const dLat = latA - latB;
  const dLon = (lonA - lonB) * Math.cos(((latA + latB) / 2) * Math.PI / 180);
  return dLat * dLat + dLon * dLon;
}

/**
 * 按坐标就近匹配縣市（以縣市政府所在地为代表点）。
 * @param latitude - 纬度
 * @param longitude - 经度
 * @returns 最近的縣市
 */
export function findNearestCounty(latitude: number, longitude: number): CwaCounty {
  return CWA_COUNTIES.reduce((best, county) => (
    approxDistanceSquared(latitude, longitude, county.latitude, county.longitude)
      < approxDistanceSquared(latitude, longitude, best.latitude, best.longitude) ? county : best
  ));
}

/**
 * 判断坐标是否位于台湾（含离岛）附近：距任一縣市代表点约 0.75 度（约 80 公里）以内。
 * @param latitude - 纬度
 * @param longitude - 经度
 * @returns 是否在 CWA 覆盖范围内
 */
export function isNearTaiwan(latitude: number, longitude: number): boolean {
  const nearest = findNearestCounty(latitude, longitude);
  return approxDistanceSquared(latitude, longitude, nearest.latitude, nearest.longitude) <= 0.75 * 0.75;
}
