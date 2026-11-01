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
 * @file lrclibDuration.test.ts
 * @description LRCLIB 时长感知测试 — 使用真实解析器，仅替换网络边界
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequestJsonWithLog = vi.hoisted(() => vi.fn());

vi.mock('../../request', () => ({ requestJsonWithLog: mockRequestJsonWithLog }));

import { fetchLyricsFromLrclib } from '../lrclib';

const track = (duration: number, lyric: string) => ({ duration, syncedLyrics: `[00:01.00]${lyric}` });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('fetchLyricsFromLrclib duration handling', () => {
  it('asks /api/get with the rounded duration first and returns its lyrics', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce(track(214, 'exact'));
    expect(await fetchLyricsFromLrclib('Never Gonna Give You Up', 'Rick Astley', 213400)).toEqual([{ time_ms: 1000, text: 'exact' }]);
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
    expect(mockRequestJsonWithLog.mock.calls[0][0]).toBe(
      'https://lrclib.net/api/get?track_name=Never%20Gonna%20Give%20You%20Up&artist_name=Rick%20Astley&duration=213',
    );
  });

  it('keeps only search results within 3 s and prefers the closest one', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([track(346, 'cake mix'), track(216, 'farther'), track(214, 'closest')]);
    expect(await fetchLyricsFromLrclib('Song', 'Artist', 213000)).toEqual([{ time_ms: 1000, text: 'closest' }]);
  });

  it('treats search results as a miss when none is close enough, then ends without a lyric', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce(null)
      .mockResolvedValue([track(346, 'cake mix'), { syncedLyrics: '[00:01.00]no duration field' }]);
    expect(await fetchLyricsFromLrclib('Song', 'Artist', 213000)).toBeNull();
  });

  it('keeps the previous behaviour when the duration is unknown', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce([track(346, 'first usable')]);
    expect(await fetchLyricsFromLrclib('Song', 'Artist')).toEqual([{ time_ms: 1000, text: 'first usable' }]);
    expect(mockRequestJsonWithLog.mock.calls[0][0]).toContain('/api/search?');
    expect(mockRequestJsonWithLog.mock.calls.some((call) => String(call[0]).includes('duration='))).toBe(false);
  });
});
