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
 * @file lyricsFontSize.ts
 * @description 展开歌曲页歌词字号的取值范围、默认值与净化函数，主进程存储校验与渲染进程设置滑块共用
 * @author 鸡哥
 */

/** 歌词字号下限（px），低于此值在展开页中难以辨认 */
export const LYRICS_FONT_SIZE_MIN = 12;

/** 歌词字号上限（px），超过后单行歌词会频繁触发轮播 */
export const LYRICS_FONT_SIZE_MAX = 28;

/** 歌词字号默认值（px），作用于当前行；下一行按 80% 展示 */
export const LYRICS_FONT_SIZE_DEFAULT = 18;

/**
 * 将任意输入规范化为合法的歌词字号
 * @param value - 待校验的值，非有限数字时使用回退值
 * @param fallback - 输入无效时的回退字号（px）
 * @returns 取整并钳制到 LYRICS_FONT_SIZE_MIN~LYRICS_FONT_SIZE_MAX 之间的字号
 */
export function sanitizeLyricsFontSize(value: unknown, fallback: number = LYRICS_FONT_SIZE_DEFAULT): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(LYRICS_FONT_SIZE_MAX, Math.max(LYRICS_FONT_SIZE_MIN, Math.round(value)));
}
