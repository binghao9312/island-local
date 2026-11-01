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
 * @file useLyricsIslandWidthSync.ts
 * @description 歌词行变化时测量内容自然宽度并写入全局状态，供壳层收缩宽度；仅在文本变化时重测，不随逐字进度重测
 * @author 鸡哥
 */

import { useLayoutEffect } from 'react';
import useIslandStore from '../../../../store/slices';
import { LYRICS_CLOCK_FONT, LYRICS_MAIN_FONT, LYRICS_TRANSLATION_FONT } from '../config/lyricsConstants';
import { measureLyricsContentWidth, measureLyricsTextWidth } from '../utils/lyricsIslandWidth';

interface UseLyricsIslandWidthSyncOptions {
  /** 当前显示的原文行；加载中、前奏或无歌词时传空字符串 */
  lineText: string;
  /** 当前显示的翻译行；仅翻译歌词状态传入，其余传空字符串 */
  translationText: string;
  /** 北京时间文本；时钟未显示时传空字符串 */
  clockText: string;
}

/**
 * 在歌词文本或时钟文本变化时测量并写入内容自然宽度。
 * @description 使用 layout effect，使新宽度在浏览器绘制前生效，避免先按旧宽度绘制一帧。
 * @param options - 当前显示的文本，空字符串表示该部分不占宽度。
 */
export function useLyricsIslandWidthSync(options: UseLyricsIslandWidthSyncOptions): void {
  const { lineText, translationText, clockText } = options;

  useLayoutEffect(() => {
    const textWidth = Math.max(
      measureLyricsTextWidth(lineText, LYRICS_MAIN_FONT),
      measureLyricsTextWidth(translationText, LYRICS_TRANSLATION_FONT),
    );
    const clockWidth = clockText ? measureLyricsTextWidth(clockText, LYRICS_CLOCK_FONT) : null;
    useIslandStore.getState().setLyricsContentWidth(measureLyricsContentWidth({ textWidth, clockWidth }));
  }, [lineText, translationText, clockText]);
}
