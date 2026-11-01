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
 * @file lyrics.test.ts
 * @description 歌词模块单元测试
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

const fetchLyricsFromLrcRed = vi.hoisted(() => vi.fn());
const fetchLyricsFromLrclib = vi.hoisted(() => vi.fn());
const fetchLyricsFromAppleMusic = vi.hoisted(() => vi.fn());
const fetchLyricsFromSpotify = vi.hoisted(() => vi.fn());

vi.mock('../normal/providers/lrcred', () => ({ fetchLyricsFromLrcRed }));
vi.mock('../normal/providers/lrclib', () => ({ fetchLyricsFromLrclib }));
vi.mock('../normal/providers/appleMusic', () => ({ fetchLyricsFromAppleMusic }));
vi.mock('../normal/providers/spotify', () => ({ fetchLyricsFromSpotify }));

import type { LyricLine } from '../index';
import { getCurrentLyric, getNearbyLyrics, fetchLyrics, fetchLyricsWithTranslation } from '../index';

function makeLyric(time_ms: number, text: string): LyricLine {
  return { time_ms, text };
}

const SAMPLE_LYRICS: LyricLine[] = [
  makeLyric(0, 'line-0'),
  makeLyric(5000, 'line-5'),
  makeLyric(10000, 'line-10'),
  makeLyric(15000, 'line-15'),
  makeLyric(20000, 'line-20'),
];

describe('getCurrentLyric', () => {
  it('returns null for empty lyrics', () => {
    expect(getCurrentLyric([], 1000)).toBeNull();
  });

  it('returns null when position is before all lyrics', () => {
    expect(getCurrentLyric(SAMPLE_LYRICS, -1)).toBeNull();
  });

  it('returns the lyric matching the exact position', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 10000);
    expect(result).toEqual(makeLyric(10000, 'line-10'));
  });

  it('returns the correct lyric when position is between two lines', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 7000);
    expect(result).toEqual(makeLyric(5000, 'line-5'));
  });

  it('returns the last lyric when position is after all lyrics', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 99999);
    expect(result).toEqual(makeLyric(20000, 'line-20'));
  });

  it('returns the first lyric when position is exactly at the start', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 0);
    expect(result).toEqual(makeLyric(0, 'line-0'));
  });
});

describe('getNearbyLyrics', () => {
  it('returns empty array for empty lyrics', () => {
    expect(getNearbyLyrics([], 1000)).toEqual([]);
  });

  it('returns empty array when position is before all lyrics', () => {
    expect(getNearbyLyrics(SAMPLE_LYRICS, -1)).toEqual([]);
  });

  it('returns current + 2 before + 2 after', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 10000);
    expect(result).toEqual([
      { text: 'line-0', isCurrent: false },
      { text: 'line-5', isCurrent: false },
      { text: 'line-10', isCurrent: true },
      { text: 'line-15', isCurrent: false },
      { text: 'line-20', isCurrent: false },
    ]);
  });

  it('handles boundary at the start of lyrics', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 0);
    expect(result).toEqual([
      { text: 'line-0', isCurrent: true },
      { text: 'line-5', isCurrent: false },
      { text: 'line-10', isCurrent: false },
    ]);
  });

  it('handles boundary at the end of lyrics', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 99999);
    expect(result).toEqual([
      { text: 'line-10', isCurrent: false },
      { text: 'line-15', isCurrent: false },
      { text: 'line-20', isCurrent: true },
    ]);
  });

  it('returns fewer items when lyrics array is shorter than the window', () => {
    const short: LyricLine[] = [makeLyric(0, 'a'), makeLyric(1000, 'b')];
    const result = getNearbyLyrics(short, 500);
    expect(result).toEqual([
      { text: 'a', isCurrent: true },
      { text: 'b', isCurrent: false },
    ]);
  });
});

describe('fetchLyrics', () => {
  let musicLyricsSourceGet: Mock;
  let musicDetectSourceAppId: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    musicLyricsSourceGet = vi.fn(async () => 'auto');
    musicDetectSourceAppId = vi.fn(async () => ({ ok: true, sources: [] }));
    Object.defineProperty(globalThis, 'window', {
      value: { api: { musicLyricsSourceGet, musicDetectSourceAppId } },
      configurable: true,
      writable: true,
    });
  });

  it('uses lrclib directly when setting is lrclib-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('lrclib-only');
    const expected: LyricLine[] = [makeLyric(0, 'lrclib-line')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromLrclib).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(fetchLyricsFromLrcRed).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('routes to forced provider when setting is applemusic-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('applemusic-only');
    const expected: LyricLine[] = [makeLyric(0, 'apple-line')];
    fetchLyricsFromAppleMusic.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromAppleMusic).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(result).toEqual(expected);
  });

  it('falls back to lrclib when forced provider returns null', async () => {
    musicLyricsSourceGet.mockResolvedValue('applemusic-only');
    fetchLyricsFromAppleMusic.mockResolvedValue(null);
    const expected: LyricLine[] = [makeLyric(0, 'fallback')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromAppleMusic).toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(result).toEqual(expected);
  });

  it('falls back to automatic selection when the stored source id was removed', async () => {
    musicLyricsSourceGet.mockResolvedValue('qqmusic-only');
    const expected: LyricLine[] = [makeLyric(0, 'lrcred-line')];
    fetchLyricsFromLrcRed.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromLrcRed).toHaveBeenCalled();
    expect(fetchLyricsFromAppleMusic).not.toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('detects provider from sourceAppId and tries it after lrc.red', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    const expected: LyricLine[] = [makeLyric(0, 'spotify-line')];
    fetchLyricsFromLrcRed.mockResolvedValue(null);
    fetchLyricsFromSpotify.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist', 'Spotify.exe');

    expect(fetchLyricsFromLrcRed.mock.invocationCallOrder[0]).toBeLessThan(fetchLyricsFromSpotify.mock.invocationCallOrder[0]);
    expect(fetchLyricsFromSpotify).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(fetchLyricsFromLrclib).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('falls through providers in order when all return null', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchLyricsFromLrcRed.mockResolvedValue(null);
    fetchLyricsFromAppleMusic.mockResolvedValue(null);
    fetchLyricsFromSpotify.mockResolvedValue(null);
    const expected: LyricLine[] = [makeLyric(0, 'lrclib')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromLrcRed).toHaveBeenCalled();
    expect(fetchLyricsFromAppleMusic).toHaveBeenCalled();
    expect(fetchLyricsFromSpotify).toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).toHaveBeenCalled();
    expect(fetchLyricsFromLrclib.mock.invocationCallOrder[0]).toBeGreaterThan(fetchLyricsFromSpotify.mock.invocationCallOrder[0]);
    expect(result).toEqual(expected);
  });

  it('stops at first successful provider', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    const expected: LyricLine[] = [makeLyric(0, 'lrcred-line')];
    fetchLyricsFromLrcRed.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromLrcRed).toHaveBeenCalled();
    expect(fetchLyricsFromAppleMusic).not.toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('marks translation unsupported for single-source results', async () => {
    musicLyricsSourceGet.mockResolvedValue('spotify-only');
    const lyrics: LyricLine[] = [makeLyric(0, 'spotify-line')];
    fetchLyricsFromSpotify.mockResolvedValueOnce(lyrics);

    const result = await fetchLyricsWithTranslation('song', 'artist');

    expect(fetchLyricsFromSpotify).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(result).toEqual({ lyrics, translation: { status: 'unsupported', lines: null } });
  });

  it('returns null when all providers including lrclib fail', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchLyricsFromLrcRed.mockResolvedValue(null);
    fetchLyricsFromAppleMusic.mockResolvedValue(null);
    fetchLyricsFromSpotify.mockResolvedValue(null);
    fetchLyricsFromLrclib.mockResolvedValue(null);

    const result = await fetchLyrics('song', 'artist');

    expect(result).toBeNull();
  });
});
