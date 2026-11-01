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
 * @file lyricsConstants.ts
 * @description 歌词组件配置常量
 * @author 鸡哥
 */

import { ISLAND_WIDTH } from '../../../../../shared/islandDimensions';

/** 音乐外发光效果的持久化存储键 */
export const MUSIC_OUTER_GLOW_EFFECT_STORE_KEY = 'music-outer-glow-effect-enabled';

/** 歌词灵动岛最大宽度（像素），与主进程 LYRICS_WIDTH 及 shell.css 回退值一致 */
export const LYRICS_ISLAND_MAX_WIDTH = 500;

/** 歌词灵动岛最小宽度（像素），即收起态灵动岛宽度 */
export const LYRICS_ISLAND_MIN_WIDTH = ISLAND_WIDTH;

/** 歌词内容区左右内边距、封面直径、内部间距与时钟左外边距（像素），与 lyrics.css 保持一致 */
export const LYRICS_CONTENT_SIDE_PADDING = 16;
export const LYRICS_COVER_SIZE = 30;
export const LYRICS_CONTENT_GAP = 8;
export const LYRICS_CLOCK_MARGIN = 4;

/** 凹角刘海形态下壳层左右各 16px 内边距（shell.css），需计入壳层宽度 */
export const LYRICS_NOTCH_CONCAVE_SHELL_INSET = 32;

/** 文本测量字体，与 lyrics.css 中当前行、翻译行与时钟的字号字重一致 */
export const LYRICS_MAIN_FONT = { size: 13, weight: 500 } as const;
export const LYRICS_TRANSLATION_FONT = { size: 11, weight: 400 } as const;
export const LYRICS_CLOCK_FONT = { size: 13, weight: 500 } as const;
