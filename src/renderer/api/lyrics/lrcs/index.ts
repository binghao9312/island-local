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
 * @description 歌词拉取统一入口 — 按 SMTC 进程自动选源 + 多级回退 + LRCLIB 兜底
 * @author 鸡哥
 */

import type { LyricLine, LyricsFetchResult } from './normal/types';
import { fetchLyricsFromLrclib } from './normal/providers/lrclib';
import { fetchLyricsFromLrcRed } from './normal/providers/lrcred';
import { fetchLyricsFromAppleMusic } from './normal/providers/appleMusic';
import { fetchLyricsFromSpotify } from './normal/providers/spotify';
import { unsupportedTranslationLyrics } from './normal/translation';
import { convertLyricsResultToTraditional, shouldConvertLyricsToTraditional } from './lyricsTraditional';

export type {
  LyricLine,
  LyricsFetchResult,
  TranslationLyricsResult,
  TranslationLyricsStatus,
} from './normal/types';
export { fetchLyricsFromLrclib } from './normal/providers/lrclib';
export { fetchLyricsFromLrcRed } from './normal/providers/lrcred';
export { fetchLyricsFromAppleMusic } from './normal/providers/appleMusic';
export { fetchLyricsFromSpotify } from './normal/providers/spotify';

type Provider = 'lrcred' | 'applemusic' | 'spotify';

/** `durationMs` 为播放器时长，目前仅 lrc.red 与 LRCLIB 用它挑选版本，其余源忽略 */
type FetchFn = (title: string, artist: string, durationMs?: number) => Promise<LyricsFetchResult | null>;

async function fetchWithUnsupportedTranslation(
  fetchLyricsOnly: (title: string, artist: string, durationMs?: number) => Promise<LyricLine[] | null>,
  title: string,
  artist: string,
  durationMs?: number,
): Promise<LyricsFetchResult | null> {
  const lyrics = await fetchLyricsOnly(title, artist, durationMs);
  return lyrics && lyrics.length > 0
    ? { lyrics, translation: unsupportedTranslationLyrics() }
    : null;
}

const PROVIDER_MAP: Record<Provider, FetchFn> = {
  lrcred: (title, artist, durationMs) => fetchWithUnsupportedTranslation(fetchLyricsFromLrcRed, title, artist, durationMs),
  applemusic: (title, artist) => fetchWithUnsupportedTranslation(fetchLyricsFromAppleMusic, title, artist),
  spotify: (title, artist) => fetchWithUnsupportedTranslation(fetchLyricsFromSpotify, title, artist),
};

/** lrc.red 排在最前：它按时长挑选版本，比各播放器自带源更不易拿到「另一个版本」的歌词 */
const ALL_PROVIDERS: Provider[] = ['lrcred', 'applemusic', 'spotify'];

const PROCESS_TO_PROVIDER: Array<{ pattern: RegExp; provider: Provider }> = [
  { pattern: /AppleMusicWin|AppleInc\.AppleMusic/i, provider: 'applemusic' },
  { pattern: /Spotify/i, provider: 'spotify' },
];

function detectProviderFromProcess(sourceAppId: string): Provider | null {
  if (!sourceAppId) return null;
  const lower = sourceAppId.toLowerCase();
  const matched = PROCESS_TO_PROVIDER.find(({ pattern }) => pattern.test(lower));
  return matched?.provider ?? null;
}

async function tryProviders(
  providers: Provider[],
  title: string,
  artist: string,
  durationMs?: number,
): Promise<LyricsFetchResult | null> {
  return providers.reduce<Promise<LyricsFetchResult | null>>(async (prevPromise, provider) => {
    const prev = await prevPromise;
    if (prev) return prev;
    try {
      const result = await PROVIDER_MAP[provider](title, artist, durationMs);
      return result && result.lyrics.length > 0 ? result : null;
    } catch {
      return null;
    }
  }, Promise.resolve(null));
}

/** 已移除的源（如 `qqmusic-only`）查不到映射，会按自动模式处理 */
const SOURCE_SETTING_TO_PROVIDER: Record<string, Provider> = {
  'lrcred-only': 'lrcred',
  'applemusic-only': 'applemusic',
  'spotify-only': 'spotify',
};

async function readLyricsSourceSetting(): Promise<string> {
  try {
    return await window.api.musicLyricsSourceGet();
  } catch {
    return 'auto';
  }
}

/**
 * 按设置与 SMTC 进程选源并拉取歌词（不含繁体转换）
 * @param title - 歌名
 * @param artist - 艺术家
 * @param sourceAppId - 可选的 SMTC sourceAppId
 * @param durationMs - 可选的播放器时长（毫秒）
 * @returns 歌词与翻译；所有源均未命中返回 null
 */
async function selectLyricsWithTranslation(
  title: string,
  artist: string,
  sourceAppId?: string,
  durationMs?: number,
): Promise<LyricsFetchResult | null> {
  const setting = await readLyricsSourceSetting();

  if (setting === 'lrclib-only') {
    return fetchWithUnsupportedTranslation(fetchLyricsFromLrclib, title, artist, durationMs);
  }

  const forced = SOURCE_SETTING_TO_PROVIDER[setting];
  if (forced) {
    const result = await tryProviders([forced], title, artist, durationMs);
    if (result) return result;
    return fetchWithUnsupportedTranslation(fetchLyricsFromLrclib, title, artist, durationMs);
  }

  const appId = sourceAppId ?? await resolveSourceAppId();
  const primary = detectProviderFromProcess(appId);

  if (primary) {
    const fallback = ALL_PROVIDERS.filter((p) => p !== primary && p !== 'lrcred');
    const result = await tryProviders(['lrcred', primary, ...fallback], title, artist, durationMs);
    if (result) return result;
  } else {
    const result = await tryProviders(ALL_PROVIDERS, title, artist, durationMs);
    if (result) return result;
  }

  return fetchWithUnsupportedTranslation(fetchLyricsFromLrclib, title, artist, durationMs);
}

/**
 * 拉取歌词（含翻译），并按设置把简体歌词转换为台湾繁体
 * @param title - 歌名
 * @param artist - 艺术家
 * @param sourceAppId - 可选的 SMTC sourceAppId，未传入时主动查询
 * @param durationMs - 可选的播放器时长（毫秒），供 lrc.red / LRCLIB 挑选时长匹配的版本
 * @returns 歌词与翻译；所有源均未命中返回 null
 */
export async function fetchLyricsWithTranslation(
  title: string,
  artist: string,
  sourceAppId?: string,
  durationMs?: number,
): Promise<LyricsFetchResult | null> {
  const result = await selectLyricsWithTranslation(title, artist, sourceAppId, durationMs);
  return result && shouldConvertLyricsToTraditional() ? convertLyricsResultToTraditional(result) : result;
}

export async function fetchLyrics(
  title: string,
  artist: string,
  sourceAppId?: string,
  durationMs?: number,
): Promise<LyricLine[] | null> {
  const result = await fetchLyricsWithTranslation(title, artist, sourceAppId, durationMs);
  return result?.lyrics ?? null;
}

async function resolveSourceAppId(): Promise<string> {
  try {
    const resp = await window.api.musicDetectSourceAppId();
    if (!resp?.ok || !resp.sources || resp.sources.length === 0) return '';
    const playing = resp.sources.find((s) => s.isPlaying && s.hasTitle);
    return (playing ?? resp.sources[0]).sourceAppId ?? '';
  } catch {
    return '';
  }
}

/**
 * 获取当前播放位置对应的歌词行
 * @param lyrics - 同步歌词行数组
 * @param positionMs - 当前播放位置（毫秒）
 * @returns 当前歌词行，无匹配时返回 null
 */
export function getCurrentLyric(lyrics: LyricLine[], positionMs: number): LyricLine | null {
  if (lyrics.length === 0) return null;
  return lyrics.reduce<LyricLine | null>((acc, line) => (line.time_ms <= positionMs ? line : acc), null);
}

/**
 * 获取当前歌词行及其附近行（前2行 + 当前 + 后2行）
 * @param lyrics - 同步歌词行数组
 * @param positionMs - 当前播放位置（毫秒）
 * @returns 附近歌词行数组，每项包含 text 和 isCurrent 标记
 */
export function getNearbyLyrics(
  lyrics: LyricLine[],
  positionMs: number,
): Array<{ text: string; isCurrent: boolean }> {
  if (lyrics.length === 0) return [];

  const currentIdx = lyrics.reduce<number | null>((acc, line, index) => (line.time_ms <= positionMs ? index : acc), null);
  if (currentIdx === null) return [];

  const start = Math.max(0, currentIdx - 2);
  const end = Math.min(lyrics.length, currentIdx + 3);

  return lyrics.slice(start, end).map((line, i) => ({
    text: line.text,
    isCurrent: start + i === currentIdx,
  }));
}
