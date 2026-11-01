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
 * @file index.test.ts
 * @description fetchKaraokeLyrics 单元测试 — 模拟所有 provider 与 window.api
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

const fetchKaraokeFromLrcRed = vi.hoisted(() => vi.fn());
const fetchKaraokeFromAppleMusic = vi.hoisted(() => vi.fn());

vi.mock('../providers/lrcred', () => ({ fetchKaraokeFromLrcRed }));
vi.mock('../providers/appleMusic', () => ({ fetchKaraokeFromAppleMusic }));

import type { KaraokeLine } from '../types';
import { fetchKaraokeLyrics } from '../index';

function makeLine(time_ms: number, text: string): KaraokeLine {
  return { time_ms, duration_ms: 0, text, syllables: [] };
}

const SAMPLE_KARAOKE: KaraokeLine[] = [makeLine(0, 'hello'), makeLine(5000, 'world')];

describe('fetchKaraokeLyrics', () => {
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

  it('returns null on empty title without throwing', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('', 'artist');

    expect(result).toBeNull();
  });

  it('uses forced provider when source setting is applemusic-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('applemusic-only');
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalledWith('song', 'artist');
    expect(fetchKaraokeFromLrcRed).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('uses forced provider when source setting is lrcred-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('lrcred-only');
    fetchKaraokeFromLrcRed.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', undefined, 213000);

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalledWith('song', 'artist', 213000);
    expect(fetchKaraokeFromAppleMusic).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('falls back to automatic selection when the stored source id was removed', async () => {
    musicLyricsSourceGet.mockResolvedValue('qqmusic-only');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalledWith('song', 'artist', undefined);
    expect(fetchKaraokeFromAppleMusic).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('returns null when setting is lrclib-only (no karaoke from lrclib)', async () => {
    musicLyricsSourceGet.mockResolvedValue('lrclib-only');

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).not.toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('falls back through provider chain when first providers return null', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('stops at first successful provider', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('returns null when all providers fail', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(result).toBeNull();
  });

  it('handles provider throwing an error and continues to next', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockRejectedValue(new Error('network error'));
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('ignores providers returning empty arrays and continues', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue([]);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to applemusic based on AppleMusicWin sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'AppleMusicWin.exe');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to applemusic based on AppleInc.AppleMusic sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'AppleInc.AppleMusic_nzskd');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('has no karaoke provider for Spotify sessions and uses the automatic chain', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist', 'Spotify.exe');

    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('case-insensitive sourceAppId matching (APPLEMUSICWIN.EXE)', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'APPLEMUSICWIN.EXE');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('uses window.api.musicLyricsSourceGet to read source setting', async () => {
    musicLyricsSourceGet.mockResolvedValue('applemusic-only');
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    await fetchKaraokeLyrics('song', 'artist');

    expect(musicLyricsSourceGet).toHaveBeenCalled();
  });

  it('falls back to auto when musicLyricsSourceGet throws', async () => {
    musicLyricsSourceGet.mockRejectedValue(new Error('settings unavailable'));
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist');

    // all providers were tried (auto fallback)
    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('uses window.api.musicDetectSourceAppId for auto-detection when no sourceAppId provided', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [{ isPlaying: true, hasTitle: true, sourceAppId: 'AppleMusicWin.exe' }],
    });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(musicDetectSourceAppId).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('prefers playing source over non-playing source in auto-detection', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [
        { isPlaying: false, hasTitle: true, sourceAppId: 'Spotify.exe' },
        { isPlaying: true, hasTitle: true, sourceAppId: 'AppleMusicWin.exe' },
      ],
    });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('falls back to first source when none is playing in auto-detection', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [
        { isPlaying: false, hasTitle: true, sourceAppId: 'AppleMusicWin.exe' },
      ],
    });
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('skips musicDetectSourceAppId when sourceAppId is provided', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(SAMPLE_KARAOKE);

    await fetchKaraokeLyrics('song', 'artist', 'AppleMusicWin.exe');

    expect(musicDetectSourceAppId).not.toHaveBeenCalled();
  });

  it('falls through all providers when detected primary fails', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromLrcRed.mockResolvedValue(null);
    fetchKaraokeFromAppleMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist', 'AppleMusicWin.exe');

    // lrc.red still runs first per automatic order, then the detected applemusic source
    expect(fetchKaraokeFromLrcRed).toHaveBeenCalled();
    expect(fetchKaraokeFromAppleMusic).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
