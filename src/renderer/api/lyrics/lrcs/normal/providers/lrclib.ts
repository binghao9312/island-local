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
 * @file lrclib.ts
 * @description LRCLIB 歌词拉取 — 多策略搜索（标题+艺术家 / 纯标题 / 标题关键词）+ 同步歌词提取
 * @author 鸡哥
 */

import type { LyricLine } from '../types';
import {
  cleanArtist,
  cleanTitle,
  extractSyncedFromArray,
  extractSyncedFromObject,
} from '../helpers';
import { requestJsonWithLog } from '../request';

/** 候选时长与播放器时长允许的最大偏差（毫秒），与 LRCLIB `/api/get` 自身的 ±2 秒容差同量级 */
const DURATION_TOLERANCE_MS = 3000;

/**
 * 按播放器时长过滤并排序搜索结果
 * @param items - LRCLIB 搜索结果
 * @param durationMs - 播放器时长（毫秒），未知（0/undefined）时原样返回
 * @returns 时长在容差内的结果，偏差最小者排在最前
 */
function filterByDuration(items: unknown[], durationMs?: number): unknown[] {
  if (!durationMs || durationMs <= 0) return items;
  const diffOf = (item: unknown): number => {
    const seconds = item && typeof item === 'object' ? (item as Record<string, unknown>).duration : undefined;
    return typeof seconds === 'number' ? Math.abs(seconds * 1000 - durationMs) : Infinity;
  };
  return items
    .filter((item) => diffOf(item) <= DURATION_TOLERANCE_MS)
    .sort((a, b) => diffOf(a) - diffOf(b));
}

/**
 * LRCLIB 同步歌词入口
 * @param title - 歌名
 * @param artist - 艺术家
 * @param durationMs - 播放器时长（毫秒）；已知时优先走 `/api/get` 精确匹配，并过滤时长不符的搜索结果
 * @returns 同步歌词行；未命中返回 null
 */
export async function fetchLyricsFromLrclib(title: string, artist: string, durationMs?: number): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const headers = { 'User-Agent': 'DynamicIsland/1.0 (https://github.com/user/dynamic-island)' };
  const durationParam = durationMs && durationMs > 0 ? `&duration=${Math.round(durationMs / 1000)}` : '';

  if (durationParam) {
    const exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}${durationParam}`;
    try {
      const json = await requestJsonWithLog<Record<string, unknown>>(exactUrl, { headers });
      if (json) {
        const lines = extractSyncedFromObject(json);
        if (lines) return lines;
      }
    } catch {
      // ignore
    }
  }

  const url1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  try {
    const json = await requestJsonWithLog<unknown[]>(url1, { headers });
    if (json) {
      const lines = extractSyncedFromArray(filterByDuration(json, durationMs));
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  if (cleanedTitle !== title || cleanedArtist !== artist) {
    const url2 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
    try {
      const json = await requestJsonWithLog<unknown[]>(url2, { headers });
      if (json) {
        const lines = extractSyncedFromArray(filterByDuration(json, durationMs));
        if (lines) return lines;
      }
    } catch {
      // ignore
    }
  }

  const query = `${cleanedTitle} ${cleanedArtist}`;
  const url3 = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  try {
    const json = await requestJsonWithLog<unknown[]>(url3, { headers });
    if (json) {
      const lines = extractSyncedFromArray(filterByDuration(json, durationMs));
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  const url4 = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}${durationParam}`;
  try {
    const json = await requestJsonWithLog<Record<string, unknown>>(url4, { headers });
    if (json) {
      const lines = extractSyncedFromObject(json);
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  return null;
}
