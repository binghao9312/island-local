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
 * @file index.ts
 * @description 天气描述文案工具：将天气描述映射为短文本，并支持 i18n 翻译回退
 * @author 鸡哥
 */

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * 将天气描述压缩为更短的显示文本（优先使用 i18n 词条）。
 */
export function abbreviateWeatherDescription(description?: string, t?: TranslateFn): string {
  const text = (description ?? '').trim();
  if (!text) return '';

  // CWA 返回繁体文案，统一折算为简体字再匹配关键字。
  const normalized = text.replace(/陰/g, '阴').replace(/雲/g, '云').replace(/陣/g, '阵').replace(/霧/g, '雾').replace(/凍/g, '冻').replace(/夾/g, '夹').replace(/塵/g, '尘').replace(/細/g, '细').replace(/強/g, '强').replace(/風/g, '风').replace(/溫/g, '温');
  const lower = normalized.toLowerCase();

  const tr = (key: string, fallback: string): string => t?.(key, { defaultValue: fallback }) ?? fallback;

  if (normalized.includes('雷') || lower.includes('thunder') || lower.includes('storm')) return tr('weatherAbbr.thunder', '雷雨');
  if (normalized.includes('冰雹') || normalized.includes('雹') || lower.includes('hail')) return tr('weatherAbbr.hail', '冰雹');
  if (normalized.includes('雨夹雪') || lower.includes('sleet') || lower.includes('wintry mix')) return tr('weatherAbbr.sleet', '雨夹雪');
  if (normalized.includes('冻雨') || lower.includes('freezing rain')) return tr('weatherAbbr.freezingRain', '冻雨');
  if (normalized.includes('暴雪') || lower.includes('blizzard')) return tr('weatherAbbr.snow', '降雪');
  if (normalized.includes('雪') || lower.includes('snow')) return tr('weatherAbbr.snow', '降雪');
  if (normalized.includes('特大暴雨') || normalized.includes('暴雨') || lower.includes('torrential rain') || lower.includes('heavy rain') || lower.includes('downpour')) return tr('weatherAbbr.heavyRain', '暴雨');
  if (normalized.includes('阵雨') || lower.includes('shower')) return tr('weatherAbbr.shower', '阵雨');
  if (normalized.includes('毛毛雨') || normalized.includes('细雨') || lower.includes('drizzle')) return tr('weatherAbbr.drizzle', '毛毛雨');
  if (normalized.includes('雨') || lower.includes('rain')) return tr('weatherAbbr.rain', '降雨');
  if (normalized.includes('沙尘暴') || normalized.includes('扬沙') || lower.includes('sandstorm') || lower.includes('blowing sand')) return tr('weatherAbbr.sandstorm', '沙尘暴');
  if (normalized.includes('霾') || lower.includes('haze') || lower.includes('smog')) return tr('weatherAbbr.haze', '霾');
  if (normalized.includes('雾') || lower.includes('fog') || lower.includes('mist') || lower.includes('dust') || lower.includes('sand')) return tr('weatherAbbr.fog', '雾');
  if (normalized.includes('大风') || normalized.includes('强风') || lower.includes('wind') || lower.includes('breeze') || lower.includes('gale')) return tr('weatherAbbr.wind', '大风');
  if (normalized.includes('高温') || normalized.includes('炎热') || lower.includes('hot')) return tr('weatherAbbr.hot', '高温');
  if (normalized.includes('低温') || normalized.includes('寒冷') || lower.includes('cold') || lower.includes('freezing')) return tr('weatherAbbr.cold', '低温');
  if (normalized.includes('阴') || lower.includes('overcast')) return tr('weatherAbbr.overcast', '阴天');
  if (normalized.includes('多云') || normalized.includes('云') || lower.includes('cloud')) return tr('weatherAbbr.cloudy', '多云');
  if (normalized.includes('晴') || lower.includes('sunny') || lower.includes('clear')) return tr('weatherAbbr.sunny', '晴天');
  if (normalized.includes('未知') || lower === 'unknown' || lower === 'n/a') return tr('weatherAbbr.unknown', '未知');

  return text;
}
