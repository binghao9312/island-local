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
 * @file overviewClockUtils.ts
 * @description 总览时钟配置的归一化、时间与日期本地化格式化、以及动态时钟样式的生成
 * @author 鸡哥
 */

import type { CSSProperties } from 'react';
import { getDayName } from '../../../../../../utils/timeUtils';
import {
  DEFAULT_OVERVIEW_CLOCK_CONFIG,
  OVERVIEW_CLOCK_DATE_FORMAT_OPTIONS,
  OVERVIEW_CLOCK_FONT_MAP,
  OVERVIEW_CLOCK_FONT_OPTIONS,
  OVERVIEW_CLOCK_SIZE_MAP,
  OVERVIEW_CLOCK_SIZE_OPTIONS,
  OVERVIEW_CLOCK_WEIGHT_MAP,
  OVERVIEW_CLOCK_WEIGHT_OPTIONS,
} from '../config/overviewConfig';
import type {
  OverviewClockColorMode,
  OverviewClockConfig,
  OverviewClockDateFormat,
  OverviewClockFontFamily,
  OverviewClockFontSize,
  OverviewClockFontWeight,
} from '../types/overviewTypes';
import { isHexColor } from './overviewTabUtils';

const COLOR_MODES: readonly OverviewClockColorMode[] = ['auto', 'solid', 'gradient', 'album'];
const FONT_VALUES = new Set<OverviewClockFontFamily>(OVERVIEW_CLOCK_FONT_OPTIONS.map((item) => item.value));
const WEIGHT_VALUES = new Set<OverviewClockFontWeight>(OVERVIEW_CLOCK_WEIGHT_OPTIONS.map((item) => item.value));
const SIZE_VALUES = new Set<OverviewClockFontSize>(OVERVIEW_CLOCK_SIZE_OPTIONS.map((item) => item.value));
const DATE_FORMAT_VALUES = new Set<OverviewClockDateFormat>(OVERVIEW_CLOCK_DATE_FORMAT_OPTIONS.map((item) => item.value));

/**
 * 校验并规范化总览时钟配置对象
 * @param raw - 外部或本地存储中的未校验数据
 * @returns 符合规范的时钟配置对象，非法字段回退默认值
 */
export function normalizeOverviewClockConfig(raw: unknown): OverviewClockConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_OVERVIEW_CLOCK_CONFIG };
  }

  const candidate = raw as Partial<OverviewClockConfig>;

  const colorMode = typeof candidate.colorMode === 'string' && COLOR_MODES.includes(candidate.colorMode as OverviewClockColorMode)
    ? (candidate.colorMode as OverviewClockColorMode)
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.colorMode;

  const solidColor = isHexColor(candidate.solidColor)
    ? candidate.solidColor
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.solidColor;

  const gradientStart = isHexColor(candidate.gradientStart)
    ? candidate.gradientStart
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.gradientStart;

  const gradientEnd = isHexColor(candidate.gradientEnd)
    ? candidate.gradientEnd
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.gradientEnd;

  const fontFamily = typeof candidate.fontFamily === 'string' && FONT_VALUES.has(candidate.fontFamily as OverviewClockFontFamily)
    ? (candidate.fontFamily as OverviewClockFontFamily)
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.fontFamily;

  const fontWeight = typeof candidate.fontWeight === 'string' && WEIGHT_VALUES.has(candidate.fontWeight as OverviewClockFontWeight)
    ? (candidate.fontWeight as OverviewClockFontWeight)
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.fontWeight;

  const fontSize = typeof candidate.fontSize === 'string' && SIZE_VALUES.has(candidate.fontSize as OverviewClockFontSize)
    ? (candidate.fontSize as OverviewClockFontSize)
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.fontSize;

  const showSeconds = typeof candidate.showSeconds === 'boolean'
    ? candidate.showSeconds
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.showSeconds;

  const is24Hour = typeof candidate.is24Hour === 'boolean'
    ? candidate.is24Hour
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.is24Hour;

  const showDate = typeof candidate.showDate === 'boolean'
    ? candidate.showDate
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.showDate;

  const dateFormat = typeof candidate.dateFormat === 'string' && DATE_FORMAT_VALUES.has(candidate.dateFormat as OverviewClockDateFormat)
    ? (candidate.dateFormat as OverviewClockDateFormat)
    : DEFAULT_OVERVIEW_CLOCK_CONFIG.dateFormat;

  return {
    colorMode,
    solidColor,
    gradientStart,
    gradientEnd,
    fontFamily,
    fontWeight,
    fontSize,
    showSeconds,
    is24Hour,
    showDate,
    dateFormat,
  };
}

/**
 * 格式化时钟日期行字符串
 * @param now - 当前时间对象
 * @param format - 日期显示格式
 * @param t - i18n 翻译函数
 * @returns 格式化后的日期行文案
 */
export function formatOverviewDate(
  now: Date,
  format: OverviewClockDateFormat,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const yyyy = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dayName = t(`overview.time.weekdays.${now.getDay()}`, { defaultValue: getDayName(now) });

  switch (format) {
    case 'slash':
      return `${yyyy}/${month}/${day}`;
    case 'short':
      return t('settings.app.layout.clock.dateFormats.shortVal', {
        defaultValue: '{{month}}/{{day}} {{dayName}}',
        month,
        day,
        dayName,
      });
    case 'full':
    default:
      return t('overview.time.date', {
        defaultValue: '{{yyyy}}年{{month}}月{{day}}日 {{dayName}}',
        yyyy,
        month,
        day,
        dayName,
      });
  }
}

/**
 * 格式化时钟主体时间字符串
 * @param now - 当前时间对象
 * @param is24Hour - 是否为 24 小时制
 * @param showSeconds - 是否显示秒数
 * @returns 格式化后的时间字符串
 */
export function formatOverviewTime(
  now: Date,
  is24Hour: boolean,
  showSeconds: boolean,
): string {
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  if (is24Hour) {
    const hh = now.getHours().toString().padStart(2, '0');
    return showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }

  const hours12 = now.getHours() % 12 || 12;
  const hh = hours12.toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  return showSeconds ? `${hh}:${mm}:${ss} ${ampm}` : `${hh}:${mm} ${ampm}`;
}

/**
 * 生成时钟文字元素的内联 CSS 样式
 * @param clockConfig - 时钟样式配置
 * @param dominantColor - 当前歌曲提取的主色调 [r, g, b]，若不可用则为 null
 * @returns 包含字体、字重、字号与色彩样式的对象
 */
export function buildOverviewClockStyle(
  clockConfig: OverviewClockConfig,
  dominantColor?: number[] | null,
): { clockStyle: CSSProperties } {
  const fontFamily = OVERVIEW_CLOCK_FONT_MAP[clockConfig.fontFamily] ?? OVERVIEW_CLOCK_FONT_MAP.system;
  const fontWeight = OVERVIEW_CLOCK_WEIGHT_MAP[clockConfig.fontWeight] ?? 700;
  const fontSize = OVERVIEW_CLOCK_SIZE_MAP[clockConfig.fontSize] ?? 72;

  const clockStyle: CSSProperties = {
    fontFamily,
    fontWeight,
    fontSize: `${fontSize}px`,
  };

  if (clockConfig.colorMode === 'solid') {
    clockStyle.color = clockConfig.solidColor;
    clockStyle.backgroundImage = 'none';
    clockStyle.WebkitBackgroundClip = 'initial';
    clockStyle.backgroundClip = 'initial';
    clockStyle.WebkitTextFillColor = clockConfig.solidColor;
  } else if (clockConfig.colorMode === 'gradient') {
    clockStyle.backgroundImage = `linear-gradient(90deg, ${clockConfig.gradientStart} 0%, ${clockConfig.gradientEnd} 100%)`;
    clockStyle.WebkitBackgroundClip = 'text';
    clockStyle.backgroundClip = 'text';
    clockStyle.WebkitTextFillColor = 'transparent';
  } else if (clockConfig.colorMode === 'album') {
    if (dominantColor && dominantColor.length >= 3) {
      const albumColor = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;
      clockStyle.color = albumColor;
      clockStyle.backgroundImage = 'none';
      clockStyle.WebkitBackgroundClip = 'initial';
      clockStyle.backgroundClip = 'initial';
      clockStyle.WebkitTextFillColor = albumColor;
    } else {
      // 跟随专辑色但当前无专辑色时，回退到自动渐变
      clockStyle.backgroundImage = 'linear-gradient(90deg, #7be4ff 0%, #8da8ff 50%, #ffd28a 100%)';
      clockStyle.WebkitBackgroundClip = 'text';
      clockStyle.backgroundClip = 'text';
      clockStyle.WebkitTextFillColor = 'transparent';
    }
  }

  return { clockStyle };
}

/**
 * 为设置面板实时预览盒生成经过缩放的时钟样式
 * @param clockConfig - 时钟样式配置
 * @param dominantColor - 当前歌曲提取的主色调 [r, g, b]，若不可用则为 null
 * @returns 适用于设置卡片小尺寸预览的时钟样式
 */
export function buildPreviewClockStyle(
  clockConfig: OverviewClockConfig,
  dominantColor?: number[] | null,
): { clockStyle: CSSProperties } {
  const base = buildOverviewClockStyle(clockConfig, dominantColor);
  const rawSize = OVERVIEW_CLOCK_SIZE_MAP[clockConfig.fontSize] ?? 72;
  const previewSize = Math.round(rawSize * 0.58);

  return {
    clockStyle: {
      ...base.clockStyle,
      fontSize: `${previewSize}px`,
    },
  };
}
