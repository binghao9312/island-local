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
 * @file WeatherApiConfig.ts
 * @description 天气接口配置数据结构定义
 * @author 鸡哥
 */

/** 天气接口配置（经纬度，可附带已解析的 CWA 縣市 / 鄉鎮） */
export interface WeatherApiConfig {
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
  /** 城市 / 地区显示名称，在没有明确縣市时用于尝试匹配 */
  city?: string;
  /** CWA 縣市名称（台/臺 均可） */
  county?: string;
  /** CWA 鄉鎮市區名称 */
  township?: string;
  /** ISO 国家代码；存在且不是 TW 时视为不在 CWA 覆盖范围 */
  countryCode?: string;
}
