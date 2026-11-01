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
 * @file lyricsIslandWidth.ts
 * @description 歌词灵动岛宽度计算：由当前歌词行的自然宽度推导壳层宽度，并钳制在收起态宽度与原 500px 之间
 * @author 鸡哥
 */

import type { IslandShapeMode } from '../../../../store/types';
import {
  LYRICS_CLOCK_MARGIN,
  LYRICS_CONTENT_GAP,
  LYRICS_CONTENT_SIDE_PADDING,
  LYRICS_COVER_SIZE,
  LYRICS_ISLAND_MAX_WIDTH,
  LYRICS_ISLAND_MIN_WIDTH,
  LYRICS_NOTCH_CONCAVE_SHELL_INSET,
} from '../config/lyricsConstants';

/** 文本测量字体（字号单位为像素，字重与 lyrics.css 一致） */
export interface LyricsTextFont {
  size: number;
  weight: number;
}

/** 无 canvas 上下文时估算拉丁字符宽度占字号的比例 */
const LATIN_WIDTH_RATIO = 0.55;

/** 无 canvas 上下文时用于识别按全角计宽的 CJK 字符区间 */
const CJK_PATTERN = /[⺀-鿿豈-﫿＀-￯぀-ヿ가-힯]/g;

/** 惰性创建的测量上下文；undefined 表示尚未初始化，null 表示当前环境不可用 */
let measureContext: CanvasRenderingContext2D | null | undefined;

/**
 * 获取复用的 2D 测量上下文，非浏览器环境返回 null。
 * @returns 测量上下文或 null。
 */
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext === undefined) {
    measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  return measureContext;
}

/**
 * 在无法测量时按字符类别估算宽度，保证测试与无 canvas 环境下结果稳定。
 * @param text - 待估算文本。
 * @param size - 字号（像素）。
 * @returns 估算宽度（像素）。
 */
function estimateTextWidth(text: string, size: number): number {
  const cjkCount = text.match(CJK_PATTERN)?.length ?? 0;
  return cjkCount * size + (text.length - cjkCount) * size * LATIN_WIDTH_RATIO;
}

/**
 * 测量一段歌词文本在歌词字体下的渲染宽度。
 * @description 调用方只应在歌词行变化时调用一次，避免逐字进度引起宽度抖动。
 * @param text - 待测文本，空字符串返回 0。
 * @param font - 字号与字重，取值来自 lyricsConstants。
 * @returns 文本宽度（像素）。
 */
export function measureLyricsTextWidth(text: string, font: LyricsTextFont): number {
  if (!text) return 0;
  const context = getMeasureContext();
  if (!context) return estimateTextWidth(text, font.size);
  const family = getComputedStyle(document.documentElement).getPropertyValue('--island-lyrics-font').trim() || 'sans-serif';
  context.font = `${font.weight} ${font.size}px ${family}`;
  return context.measureText(text).width;
}

/**
 * 计算歌词内容区的自然宽度（含封面、时钟与间距，不含壳层自身内边距）。
 * @param input - 测量结果。
 * @param input.textWidth - 当前行文本宽度（像素）；翻译行时取原文与译文中较宽者，无文本时为 0。
 * @param input.clockWidth - 北京时间文本宽度（像素）；时钟未显示时为 null。
 * @returns 内容区自然宽度（像素）。
 */
export function measureLyricsContentWidth(input: { textWidth: number; clockWidth: number | null }): number {
  const clockSpan = input.clockWidth === null ? 0 : LYRICS_CLOCK_MARGIN + input.clockWidth + LYRICS_CONTENT_GAP;
  return 2 * LYRICS_CONTENT_SIDE_PADDING + LYRICS_COVER_SIZE + LYRICS_CONTENT_GAP + clockSpan + input.textWidth;
}

/**
 * 将内容宽度钳制到 [最小宽度, 最大宽度] 并向上取整为整像素。
 * @param input - 钳制参数。
 * @param input.contentWidth - 内容区自然宽度（像素）。
 * @param input.shellInset - 壳层额外左右内边距之和（像素），非凹角刘海为 0。
 * @param input.minWidth - 最小宽度（像素），即收起态宽度。
 * @param input.maxWidth - 最大宽度（像素）；超过时歌词沿用滚动或省略。
 * @returns 壳层宽度（像素）。
 */
export function computeLyricsIslandWidth(input: {
  contentWidth: number;
  shellInset: number;
  minWidth: number;
  maxWidth: number;
}): number {
  return Math.min(input.maxWidth, Math.max(input.minWidth, Math.ceil(input.contentWidth + input.shellInset)));
}

/**
 * 解析歌词状态下壳层应使用的宽度。
 * @description 非歌词状态或尚未测量时返回 null，由样式表回退到原固定宽度。
 * @param input - 解析参数。
 * @param input.state - 当前灵动岛状态。
 * @param input.contentWidth - 内容区自然宽度（像素），null 表示尚未测量。
 * @param input.shapeMode - 形态；凹角刘海的壳层两侧带有内边距，需计入宽度。
 * @param input.cornerStyle - 边角样式。
 * @returns 壳层宽度（像素）或 null。
 */
export function resolveLyricsShellWidth(input: {
  state: string;
  contentWidth: number | null;
  shapeMode: IslandShapeMode;
  cornerStyle: 'rounded' | 'concave';
}): number | null {
  if ((input.state !== 'lyrics' && input.state !== 'lyricsTranslation') || input.contentWidth === null) return null;
  const concaveNotch = input.shapeMode === 'notch' && input.cornerStyle === 'concave';
  return computeLyricsIslandWidth({
    contentWidth: input.contentWidth,
    shellInset: concaveNotch ? LYRICS_NOTCH_CONCAVE_SHELL_INSET : 0,
    minWidth: LYRICS_ISLAND_MIN_WIDTH,
    maxWidth: LYRICS_ISLAND_MAX_WIDTH,
  });
}
