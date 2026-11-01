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
 * @file lrcred.ts
 * @description lrc.red 逐字歌词拉取 — 复用普通链路的搜索与时长匹配，仅在 TTML 带逐字计时时返回
 * @author 鸡哥
 */

import { fetchLrcRedLyrics } from '../../normal/providers/lrcred';
import type { KaraokeLine } from '../types';

/**
 * lrc.red 逐字歌词入口
 * @param title - 歌名
 * @param artist - 艺术家
 * @param durationMs - 播放器时长（毫秒），用于挑选最接近的版本
 * @returns 逐字歌词行；仅行级计时或未命中时返回 null，交由其它源处理
 */
export async function fetchKaraokeFromLrcRed(
  title: string,
  artist: string,
  durationMs?: number,
): Promise<KaraokeLine[] | null> {
  const result = await fetchLrcRedLyrics(title, artist, durationMs);
  if (!result?.hasWordTiming) return null;
  return result.lines.filter((line) => line.syllables.length > 0);
}
