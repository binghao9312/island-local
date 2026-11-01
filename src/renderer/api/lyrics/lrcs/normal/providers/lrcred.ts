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
 * @description lrc.red（BiniLyrics）歌词拉取 — 公开免密钥的 JSON 搜索接口 + TTML 歌词
 *              搜索结果不支持时长过滤，因此在本地按「标题相关 → 艺术家 → 时长最接近」挑选候选，
 *              时长偏差超过容差（默认 3 秒）的候选一律视为未命中，交由下一个源处理
 * @author 鸡哥
 */

import type { KaraokeLine } from '../../karaoke/types';
import { parseLrcRedTtml } from '../../karaoke/parsers/lrcRedTtml';
import { toSimplified } from '../../lyricsTraditional';
import { logger } from '../../../../../utils/logger';
import type { LyricLine } from '../types';
import { cleanArtist, cleanTitle } from '../helpers';
import { requestJsonWithLog, requestTextWithLog } from '../request';

const LOG_TAG = '[LrcRed]';
const API_URL = 'https://lrc.red/api/v1';
const SITE_ORIGIN = 'https://lrc.red/';

/** 候选时长与播放器时长允许的最大偏差（毫秒） */
export const LRCRED_DURATION_TOLERANCE_MS = 3000;
/** 单次搜索最多尝试下载的 TTML 数量 */
const MAX_TTML_ATTEMPTS = 3;
/** 命中缓存的有效期，对齐 lrc.red 对 TTML 的 max-age=300 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** lrc.red 搜索结果条目（仅列出实际用到的字段，`duration` 单位为秒） */
export interface LrcRedItem {
  track_name?: string;
  artist_name?: string;
  duration?: number;
  lyricsUrl?: string;
  timing_type?: string;
}

/** lrc.red 命中结果：解析后的歌词行与是否带逐字计时 */
export interface LrcRedLyrics {
  lines: KaraokeLine[];
  hasWordTiming: boolean;
}

const cache = new Map<string, { at: number; promise: Promise<LrcRedLyrics | null> }>();

/** 清空命中缓存（供测试使用） */
export function clearLrcRedCache(): void {
  cache.clear();
}

/**
 * 归一化用于比较：转小写并去掉空白与标点
 * @param text - 原文
 * @returns 归一化文本
 */
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * 按分隔符拆分艺术家并归一化
 * @param artist - 艺术家原文
 * @returns 归一化后的艺术家列表
 */
function splitArtists(artist: string): string[] {
  return artist.split(/[/,;&×、，＆]|\s+x\s+|\s+feat\.?\s+/i).map(normalizeForMatch).filter(Boolean);
}

/**
 * 计算标题相关度
 * @param wanted - 播放器标题
 * @param found - 候选标题
 * @returns 3 完全一致；2 互相包含或清洗后互相包含；0 无关
 */
function titleRelevance(wanted: string, found: string): number {
  const a = normalizeForMatch(wanted);
  const b = normalizeForMatch(found);
  if (!a || !b) return 0;
  if (a === b) return 3;
  if (a.includes(b) || b.includes(a)) return 2;
  const ca = normalizeForMatch(cleanTitle(wanted));
  const cb = normalizeForMatch(cleanTitle(found));
  return ca && cb && (ca.includes(cb) || cb.includes(ca)) ? 2 : 0;
}

/**
 * 艺术家是否相关：任一播放器艺术家与任一候选艺术家互相包含
 * @param wanted - 播放器艺术家
 * @param found - 候选艺术家
 * @returns 相关返回 true
 */
function artistRelevant(wanted: string, found: string): boolean {
  const wantedList = splitArtists(wanted);
  const foundList = splitArtists(found);
  return wantedList.some((a) => foundList.some((b) => a.includes(b) || b.includes(a)));
}

/**
 * 从搜索结果中挑出可用候选并排序
 * @param items - lrc.red 搜索结果
 * @param title - 播放器标题
 * @param artist - 播放器艺术家
 * @param durationMs - 播放器时长（毫秒），未知传 0/undefined
 * @returns 排好序的候选：标题相关度 > 艺术家相关 > 时长偏差小 > 逐字优先；时长已知且超出容差的候选被剔除
 */
export function rankLrcRedCandidates(
  items: LrcRedItem[],
  title: string,
  artist: string,
  durationMs?: number,
): LrcRedItem[] {
  const known = typeof durationMs === 'number' && durationMs > 0;
  return items
    .filter((item) => (item.timing_type === 'word' || item.timing_type === 'line')
      && typeof item.lyricsUrl === 'string' && item.lyricsUrl.length > 0)
    .map((item) => {
      const candidateMs = typeof item.duration === 'number' && item.duration > 0 ? item.duration * 1000 : undefined;
      const diff = known && candidateMs !== undefined ? Math.abs(candidateMs - durationMs) : 0;
      return {
        item,
        diff,
        title: titleRelevance(title, item.track_name ?? ''),
        artist: artistRelevant(artist, item.artist_name ?? '') ? 1 : 0,
        word: item.timing_type === 'word' ? 1 : 0,
      };
    })
    .filter((c) => c.title > 0 && c.diff <= LRCRED_DURATION_TOLERANCE_MS)
    .sort((a, b) => b.title - a.title || b.artist - a.artist || a.diff - b.diff || b.word - a.word)
    .map((c) => c.item);
}

/**
 * 仅允许从 lrc.red 站点下载 TTML，防止搜索结果把请求导向任意地址
 * @param url - 搜索结果中的 lyricsUrl（绝对地址或站内相对路径）
 * @returns 可下载的绝对地址；非 lrc.red 站点返回 null
 */
function resolveLyricsUrl(url: string): string | null {
  const absolute = url.startsWith('/') ? `${SITE_ORIGIN}${url.slice(1)}` : url;
  return absolute.startsWith(SITE_ORIGIN) ? absolute : null;
}

async function searchOnce(title: string, artist: string, durationMs?: number): Promise<LrcRedLyrics | null> {
  const url = `${API_URL}?track=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
  const json = await requestJsonWithLog<{ results?: LrcRedItem[] }>(url);
  if (!json || !Array.isArray(json.results) || json.results.length === 0) return null;

  const ranked = rankLrcRedCandidates(json.results, title, artist, durationMs);
  if (ranked.length === 0) {
    logger.warn(`${LOG_TAG} 无时长/标题匹配的候选, title="${title}", durationMs=${durationMs ?? 0}, 结果数=${json.results.length}`);
    return null;
  }

  // 按排名依次下载，首个能解析出歌词行的候选胜出
  return ranked.slice(0, MAX_TTML_ATTEMPTS).reduce<Promise<LrcRedLyrics | null>>(async (prevPromise, item) => {
    const prev = await prevPromise;
    if (prev) return prev;
    const lyricsUrl = resolveLyricsUrl(item.lyricsUrl ?? '');
    const ttml = lyricsUrl ? await requestTextWithLog(lyricsUrl) : null;
    const lines = ttml ? parseLrcRedTtml(ttml) : [];
    if (lines.length === 0) return null;
    logger.info(`${LOG_TAG} 命中: "${item.track_name}" - "${item.artist_name}" (${item.timing_type}, ${item.duration}s), 行数=${lines.length}`);
    return { lines, hasWordTiming: lines.some((line) => line.syllables.length > 0) };
  }, Promise.resolve(null));
}

async function searchLrcRed(title: string, artist: string, durationMs?: number): Promise<LrcRedLyrics | null> {
  const queries: Array<[string, string]> = [[title, artist]];
  const cleaned: [string, string] = [cleanTitle(title), cleanArtist(artist)];
  if (cleaned[0] !== title || cleaned[1] !== artist) queries.push(cleaned);

  // lrc.red 的索引以简体为主，繁体查询词可能只命中现场版，因此最后用简体再试一次
  const simplified: [string, string] = [await toSimplified(cleaned[0]), await toSimplified(cleaned[1])];
  if (!queries.some(([t, a]) => t === simplified[0] && a === simplified[1])) queries.push(simplified);

  return queries.reduce<Promise<LrcRedLyrics | null>>(async (prevPromise, [t, a]) => {
    const prev = await prevPromise;
    if (prev) return prev;
    try {
      const hit = await searchOnce(t, a, durationMs);
      return hit;
    } catch (err) {
      logger.error(`${LOG_TAG} 请求异常, title="${t}":`, err);
      return null;
    }
  }, Promise.resolve(null));
}

/**
 * 查询 lrc.red 歌词（带 5 分钟命中缓存与并发去重，普通/逐字两条链路共用一次请求）
 * @param title - 歌名
 * @param artist - 艺术家
 * @param durationMs - 播放器时长（毫秒）；未知传 0/undefined，此时不做时长过滤
 * @returns 解析后的歌词；无合格候选或请求失败返回 null
 */
export function fetchLrcRedLyrics(title: string, artist: string, durationMs?: number): Promise<LrcRedLyrics | null> {
  const key = [title, artist, durationMs && durationMs > 0 ? Math.round(durationMs / 1000) : 0].join('\u0000');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;

  // 未命中不缓存，只在请求进行期间合并并发调用；delete 发生在首个 await 之后，必然晚于下面的 set
  const promise = (async (): Promise<LrcRedLyrics | null> => {
    const result = await searchLrcRed(title, artist, durationMs);
    if (!result) cache.delete(key);
    return result;
  })();
  cache.set(key, { promise, at: Date.now() });
  return promise;
}

/**
 * lrc.red 普通歌词入口 — 逐字 TTML 也会降级为行级歌词
 * @param title - 歌名
 * @param artist - 艺术家
 * @param durationMs - 播放器时长（毫秒），用于挑选最接近的版本
 * @returns 同步歌词行；未命中返回 null
 */
export async function fetchLyricsFromLrcRed(
  title: string,
  artist: string,
  durationMs?: number,
): Promise<LyricLine[] | null> {
  const result = await fetchLrcRedLyrics(title, artist, durationMs);
  return result ? result.lines.map((line) => ({ time_ms: line.time_ms, text: line.text })) : null;
}
