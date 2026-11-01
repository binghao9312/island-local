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
 * @file providers.test.ts
 * @description 普通歌词 Provider 综合单元测试（lrclib）
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/* ---------- hoisted mock stubs ---------- */

const mockRequestJsonWithLog = vi.hoisted(() => vi.fn());

const mockCleanTitle = vi.hoisted(() => vi.fn((t: string) => t));
const mockCleanArtist = vi.hoisted(() => vi.fn((a: string) => a));
const mockExtractSyncedFromArray = vi.hoisted(() => vi.fn(() => null));
const mockExtractSyncedFromObject = vi.hoisted(() => vi.fn(() => null));

/* ---------- module mocks ---------- */

vi.mock('../../request', () => ({
  requestJsonWithLog: mockRequestJsonWithLog,
}));

vi.mock('../../helpers', () => ({
  cleanTitle: mockCleanTitle,
  cleanArtist: mockCleanArtist,
  extractSyncedFromArray: mockExtractSyncedFromArray,
  extractSyncedFromObject: mockExtractSyncedFromObject,
}));

vi.mock('../../matcher', () => ({
  makeSearchQueries: vi.fn((t: string, a: string) => [`${t} ${a}`]),
  scoreTrack: vi.fn(() => 0),
  bestMatch: vi.fn(() => null),
}));

vi.mock('../../../../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ---------- imports under test ---------- */

import { fetchLyricsFromLrclib } from '../lrclib';

/* ---------- helpers ---------- */

function okLines(...texts: string[]) {
  return texts.map((text, i) => ({ time_ms: i * 1000, text }));
}

/* ---------- per-provider suites ---------- */

/* ================================================================
 *  LRCLIB
 * ================================================================ */

describe('fetchLyricsFromLrclib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('sends User-Agent header on every request', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('t', 'a');

    mockRequestJsonWithLog.mock.calls.forEach((call) => {
      expect(call[1]?.headers?.['User-Agent']).toBe(
        'DynamicIsland/1.0 (https://github.com/user/dynamic-island)',
      );
    });
  });

  it('constructs URL1 with track_name + artist_name', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('MySong', 'MyArtist');

    const url1: string = mockRequestJsonWithLog.mock.calls[0][0];
    expect(url1).toContain('lrclib.net/api/search?');
    expect(url1).toContain(`track_name=${encodeURIComponent('MySong')}`);
    expect(url1).toContain(`artist_name=${encodeURIComponent('MyArtist')}`);
  });

  it('returns null when all strategies fail', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    expect(await fetchLyricsFromLrclib('t', 'a')).toBeNull();
  });

  it('returns early when URL1 succeeds via extractSyncedFromArray', async () => {
    const lines = okLines('hit');
    mockRequestJsonWithLog.mockResolvedValueOnce([{ synced: true }]);
    mockExtractSyncedFromArray.mockReturnValueOnce(lines);

    const result = await fetchLyricsFromLrclib('t', 'a');
    expect(result).toEqual(lines);
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
    expect(mockExtractSyncedFromArray).toHaveBeenCalledWith([{ synced: true }]);
  });

  it('skips URL2 when title/artist are already clean', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('Clean', 'Artist');

    // URL1 (search), URL3 (query), URL4 (get) = 3 calls, no URL2
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(3);
    const urls = mockRequestJsonWithLog.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(urls.some((u: string) => u.includes('/api/search?track_name='))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/search?q='))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/get?'))).toBe(true);
  });

  it('uses URL2 with cleaned title/artist when originals differ', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.replace(/\s+/g, ''));
    mockCleanArtist.mockImplementation((a: string) => a.replace(/\s+/g, ''));
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('So ng', 'Art ist');

    // URL1, URL2, URL3, URL4 = 4 calls
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(4);
    const url2: string = mockRequestJsonWithLog.mock.calls[1][0];
    expect(url2).toContain(encodeURIComponent('Song'));
    expect(url2).toContain(encodeURIComponent('Artist'));
  });

  it('uses URL4 (get) with extractSyncedFromObject as final fallback', async () => {
    const lines = okLines('from-object');
    mockRequestJsonWithLog.mockResolvedValue(null);
    mockRequestJsonWithLog.mockResolvedValueOnce(null); // URL1
    mockRequestJsonWithLog.mockResolvedValueOnce(null); // URL3
    mockRequestJsonWithLog.mockResolvedValueOnce({ syncedLyrics: '[00:01.00]x' }); // URL4
    mockExtractSyncedFromObject.mockReturnValueOnce(lines);

    const result = await fetchLyricsFromLrclib('Clean', 'Artist');
    expect(result).toEqual(lines);
    expect(mockExtractSyncedFromObject).toHaveBeenCalled();
  });

  it('constructs URL3 with q= cleanedTitle + cleanedArtist', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('Clean', 'Artist');

    const url3: string = mockRequestJsonWithLog.mock.calls[1][0];
    expect(url3).toContain('/api/search?q=');
    expect(url3).toContain(encodeURIComponent('Clean Artist'));
  });
});

