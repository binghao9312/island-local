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
 * @file overviewConfig.ts
 * @description Expanded 总览 Tab 的控件选项、时钟样式选项、默认布局与存储键。
 * @author 鸡哥
 */

import type {
  AgentQuotaFontSize,
  AgentQuotaSettings,
  OverviewClockConfig,
  OverviewClockDateFormat,
  OverviewClockFontFamily,
  OverviewClockFontSize,
  OverviewClockFontWeight,
  OverviewClockStyle,
  OverviewGradientColors,
  OverviewLayoutConfig,
  OverviewWidgetType,
} from '../types/overviewTypes';
/** 控件选项列表 */
export const OVERVIEW_WIDGET_OPTIONS: { value: OverviewWidgetType }[] = [
  { value: 'shortcuts' },
  { value: 'todo' },
  { value: 'song' },
  { value: 'album' },
  { value: 'countdown' },
  { value: 'pomodoro' },
  { value: 'mokugyo' },
  { value: 'urlFavorites' },
  { value: 'breakReminder' },
  { value: 'worldClock' },
  { value: 'alarm' },
  { value: 'performanceMonitor' },
  { value: 'agentQuota' },
];

/** 时钟样式选项 */
export const OVERVIEW_CLOCK_STYLE_OPTIONS: { value: OverviewClockStyle }[] = [
  { value: 'classic' },
  { value: 'gradient' },
  { value: 'minimal' },
];

export const DEFAULT_OVERVIEW_GRADIENT_COLORS: OverviewGradientColors = {
  start: '#7be4ff',
  middle: '#8da8ff',
  end: '#ffd28a',
};

/** Agent 额度卡片设置的存储键，与总览布局一样经由 storeRead / storeWrite 持久化 */
export const AGENT_QUOTA_SETTINGS_STORE_KEY = 'agent-quota-settings';

/** 字号档位对应的缩放系数，作用于额度卡片内的文字尺寸 */
export const AGENT_QUOTA_FONT_SCALE: Record<AgentQuotaFontSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};

/** 颜色预设，与 Agent 默认强调色保持同一色系 */
export const AGENT_QUOTA_COLOR_PRESETS: readonly string[] = [
  '#d97757',
  '#8da8ff',
  '#7be4ff',
  '#ffd28a',
  '#a6e3a1',
  '#f38ba8',
  '#cba6f7',
  '#f5f5f5',
];

export const DEFAULT_AGENT_QUOTA_SETTINGS: AgentQuotaSettings = {
  fontSize: 'medium',
  style: 'bars',
  colors: { claude: '#d97757', codex: '#8da8ff' },
};

/** 总览时钟样式持久化存储键 */
export const OVERVIEW_CLOCK_CONFIG_STORE_KEY = 'overview-clock-config';

/** 纯色模式 8 个预设色块 */
export const OVERVIEW_CLOCK_SOLID_PRESETS: readonly string[] = [
  '#ffffff',
  '#7be4ff',
  '#8da8ff',
  '#ffd28a',
  '#a6e3a1',
  '#f38ba8',
  '#cba6f7',
  '#f9e2af',
];

/** 双色渐变 6 个预设方案 */
export const OVERVIEW_CLOCK_GRADIENT_PRESETS: readonly {
  id: string;
  start: string;
  end: string;
}[] = [
  { id: 'ocean', start: '#7be4ff', end: '#8da8ff' },
  { id: 'sunset', start: '#ff7e5f', end: '#feb47b' },
  { id: 'cyber', start: '#f38ba8', end: '#7be4ff' },
  { id: 'aurora', start: '#a6e3a1', end: '#7be4ff' },
  { id: 'twilight', start: '#cba6f7', end: '#8da8ff' },
  { id: 'golden', start: '#f9e2af', end: '#ff7e5f' },
];

/** Windows 原生免下载时钟字体映射 */
export const OVERVIEW_CLOCK_FONT_MAP: Record<OverviewClockFontFamily, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  segoe: '"Segoe UI Variable Display", "Segoe UI Variable", "Segoe UI", sans-serif',
  bahnschrift: '"Bahnschrift", "Segoe UI", sans-serif',
  consolas: '"Consolas", "Courier New", monospace',
  georgia: '"Georgia", "Times New Roman", serif',
  jhenghei: '"Microsoft JhengHei UI", "Microsoft JhengHei", "Microsoft YaHei UI", sans-serif',
  cascadia: '"Cascadia Code", "Consolas", monospace',
};

/** 字重映射 */
export const OVERVIEW_CLOCK_WEIGHT_MAP: Record<OverviewClockFontWeight, number> = {
  light: 300,
  regular: 400,
  bold: 700,
  heavy: 900,
};

/** 时钟字号映射（单位 px） */
export const OVERVIEW_CLOCK_SIZE_MAP: Record<OverviewClockFontSize, number> = {
  small: 32,
  medium: 44,
  large: 58,
  xlarge: 72,
};

/** 字体选项列表 */
export const OVERVIEW_CLOCK_FONT_OPTIONS: readonly {
  value: OverviewClockFontFamily;
  labelKey: string;
  defaultLabel: string;
}[] = [
  { value: 'system', labelKey: 'settings.app.layout.clock.fonts.system', defaultLabel: '系统默认' },
  { value: 'segoe', labelKey: 'settings.app.layout.clock.fonts.segoe', defaultLabel: 'Segoe UI Variable' },
  { value: 'bahnschrift', labelKey: 'settings.app.layout.clock.fonts.bahnschrift', defaultLabel: 'Bahnschrift' },
  { value: 'consolas', labelKey: 'settings.app.layout.clock.fonts.consolas', defaultLabel: 'Consolas' },
  { value: 'georgia', labelKey: 'settings.app.layout.clock.fonts.georgia', defaultLabel: 'Georgia' },
  { value: 'jhenghei', labelKey: 'settings.app.layout.clock.fonts.jhenghei', defaultLabel: '微软正黑体' },
  { value: 'cascadia', labelKey: 'settings.app.layout.clock.fonts.cascadia', defaultLabel: 'Cascadia Code' },
];

/** 字重选项列表 */
export const OVERVIEW_CLOCK_WEIGHT_OPTIONS: readonly {
  value: OverviewClockFontWeight;
  labelKey: string;
  defaultLabel: string;
}[] = [
  { value: 'light', labelKey: 'settings.app.layout.clock.weights.light', defaultLabel: '细' },
  { value: 'regular', labelKey: 'settings.app.layout.clock.weights.regular', defaultLabel: '常规' },
  { value: 'bold', labelKey: 'settings.app.layout.clock.weights.bold', defaultLabel: '粗' },
  { value: 'heavy', labelKey: 'settings.app.layout.clock.weights.heavy', defaultLabel: '特粗' },
];

/** 字号选项列表 */
export const OVERVIEW_CLOCK_SIZE_OPTIONS: readonly {
  value: OverviewClockFontSize;
  labelKey: string;
}[] = [
  { value: 'small', labelKey: 'settings.app.layout.clock.sizes.small' },
  { value: 'medium', labelKey: 'settings.app.layout.clock.sizes.medium' },
  { value: 'large', labelKey: 'settings.app.layout.clock.sizes.large' },
  { value: 'xlarge', labelKey: 'settings.app.layout.clock.sizes.xlarge' },
];

/** 日期格式选项列表 */
export const OVERVIEW_CLOCK_DATE_FORMAT_OPTIONS: readonly {
  value: OverviewClockDateFormat;
  labelKey: string;
  defaultLabel: string;
}[] = [
  { value: 'full', labelKey: 'settings.app.layout.clock.dateFormats.full', defaultLabel: 'yyyy年MM月dd日 周X' },
  { value: 'slash', labelKey: 'settings.app.layout.clock.dateFormats.slash', defaultLabel: 'yyyy/MM/dd' },
  { value: 'short', labelKey: 'settings.app.layout.clock.dateFormats.short', defaultLabel: 'MM/dd 周X' },
];

/** 默认时钟样式配置 */
export const DEFAULT_OVERVIEW_CLOCK_CONFIG: OverviewClockConfig = {
  colorMode: 'auto',
  solidColor: '#ffffff',
  gradientStart: '#7be4ff',
  gradientEnd: '#ffd28a',
  fontFamily: 'system',
  fontWeight: 'bold',
  fontSize: 'xlarge',
  showSeconds: false,
  is24Hour: true,
  showDate: true,
  dateFormat: 'full',
};

export const LAYOUT_STORE_KEY = 'overview-layout';
export const DEFAULT_LAYOUT: OverviewLayoutConfig = {
  left: 'shortcuts',
  right: 'todo',
  clockStyle: 'classic',
  gradientColors: DEFAULT_OVERVIEW_GRADIENT_COLORS,
};

/** 旧版待办在 localStorage 中的键，主存储为空或读取失败时回退读取 */
export const LEGACY_TODOS_LOCAL_STORAGE_KEY = 'eIsland_todos';
