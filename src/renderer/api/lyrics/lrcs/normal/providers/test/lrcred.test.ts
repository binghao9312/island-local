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
 * @file lrcred.test.ts
 * @description lrc.red Provider 测试 — 以真实 JSON/TTML 结构的样例验证候选挑选、时长容差、未命中回退与缓存
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequestJsonWithLog = vi.hoisted(() => vi.fn());
const mockRequestTextWithLog = vi.hoisted(() => vi.fn());

vi.mock('../../request', () => ({
  requestJsonWithLog: mockRequestJsonWithLog,
  requestTextWithLog: mockRequestTextWithLog,
}));

import { fetchKaraokeFromLrcRed } from '../../../karaoke/providers/lrcred';
import {
  clearLrcRedCache,
  fetchLyricsFromLrcRed,
  rankLrcRedCandidates,
  type LrcRedItem,
} from '../lrcred';

const item = (overrides: Partial<LrcRedItem> & { id: string }): LrcRedItem => ({
  artist_name: 'Rick Astley',
  duration: 213,
  lyricsUrl: `https://lrc.red/s/${overrides.id}.ttml`,
  timing_type: 'word',
  track_name: 'Never Gonna Give You Up',
  ...overrides,
});

/** 节选自 `GET https://lrc.red/api/v1?track=Never Gonna Give You Up&artist=Rick Astley` 的真实结果 */
const RICK_RESULTS: LrcRedItem[] = [
  item({ id: 'GB5KW2202504', duration: 214, track_name: 'Never Gonna Give You Up (2022 Remaster)' }),
  item({ id: 'GB5KW1903177', duration: 209, timing_type: 'line', track_name: 'Never Gonna Give You Up (Pianoforte)' }),
  item({ id: 'GBARL9300135', duration: 215 }),
  item({ id: 'GBARL8700068', duration: 346, timing_type: 'line', track_name: 'Never Gonna Give You Up (Cake Mix)' }),
  item({ id: 'GBARL0600786', duration: 212 }),
  item({ id: 'US23A1918472', duration: 140, timing_type: 'none', track_name: 'Never Gonna Give You Up (Mixed)' }),
];

const WORD_TTML = '<tt><body><div><p begin="18.834" end="22.088"><span begin="18.834" end="19.086">We\'re</span> <span begin="19.086" end="19.336">no</span></p></div></body></tt>';
const LINE_TTML = '<tt><body><div><p begin="0.310" end="3.719">今天来这边是看我的</p></div></body></tt>';

beforeEach(() => {
  vi.resetAllMocks();
  clearLrcRedCache();
});

describe('rankLrcRedCandidates', () => {
  it('prefers the exact title with the closest duration, ignores timing_type none and drops versions beyond 3 s', () => {
    const ranked = rankLrcRedCandidates(RICK_RESULTS, 'Never Gonna Give You Up', 'Rick Astley', 213000);
    expect(ranked.map((c) => c.lyricsUrl?.split('/').pop())).toEqual([
      'GBARL0600786.ttml',
      'GBARL9300135.ttml',
      'GB5KW2202504.ttml',
    ]);
  });

  it('accepts a duration difference of exactly 3 s and rejects anything beyond', () => {
    const only = [item({ id: 'A', duration: 216 })];
    expect(rankLrcRedCandidates(only, 'Never Gonna Give You Up', 'Rick Astley', 213000)).toHaveLength(1);
    expect(rankLrcRedCandidates(only, 'Never Gonna Give You Up', 'Rick Astley', 213001)).toHaveLength(1);
    expect(rankLrcRedCandidates(only, 'Never Gonna Give You Up', 'Rick Astley', 212999)).toHaveLength(0);
    expect(rankLrcRedCandidates(only, 'Never Gonna Give You Up', 'Rick Astley', 300000)).toEqual([]);
  });

  it('does not filter by duration when the player duration is unknown', () => {
    expect(rankLrcRedCandidates(RICK_RESULTS, 'Never Gonna Give You Up', 'Rick Astley', 0)).toHaveLength(5);
    expect(rankLrcRedCandidates(RICK_RESULTS, 'Never Gonna Give You Up', 'Rick Astley')[0].lyricsUrl).toContain('GBARL9300135');
  });

  it('rejects candidates whose title is unrelated', () => {
    const unrelated = [item({ id: 'X', track_name: 'Something Else Entirely' })];
    expect(rankLrcRedCandidates(unrelated, 'Never Gonna Give You Up', 'Rick Astley', 213000)).toEqual([]);
  });

  it('ranks a matching artist ahead of a different artist with the same title', () => {
    const covers = [item({ id: 'COVER', artist_name: 'Someone Else', duration: 213 }), item({ id: 'ORIG', duration: 215 })];
    expect(rankLrcRedCandidates(covers, 'Never Gonna Give You Up', 'Rick Astley', 213000)[0].lyricsUrl).toContain('ORIG');
  });
});

describe('fetchLyricsFromLrcRed', () => {
  it('requests the search endpoint, downloads the best TTML and returns line-level lyrics', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: RICK_RESULTS, source: 'HIT-LRC-RED', total: RICK_RESULTS.length });
    mockRequestTextWithLog.mockResolvedValue(WORD_TTML);
    const lines = await fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000);
    expect(mockRequestJsonWithLog).toHaveBeenCalledWith('https://lrc.red/api/v1?track=Never%20Gonna%20Give%20You%20Up&artist=Rick%20Astley');
    expect(mockRequestTextWithLog).toHaveBeenCalledWith('https://lrc.red/s/GBARL0600786.ttml');
    expect(lines).toEqual([{ time_ms: 18834, text: 'We\'re no' }]);
  });

  it('is a miss when every candidate is more than 3 s away, without downloading any TTML', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: RICK_RESULTS });
    expect(await fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 300000)).toBeNull();
    expect(mockRequestTextWithLog).not.toHaveBeenCalled();
  });

  it('only downloads TTML from lrc.red and accepts site-relative URLs', async () => {
    mockRequestJsonWithLog.mockResolvedValue({
      results: [
        item({ id: 'EVIL', duration: 213, lyricsUrl: 'https://evil.example/s/x.ttml' }),
        item({ id: 'REL', duration: 214, lyricsUrl: '/s/REL.ttml' }),
      ],
    });
    mockRequestTextWithLog.mockResolvedValue(WORD_TTML);
    expect(await fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000)).toHaveLength(1);
    expect(mockRequestTextWithLog).toHaveBeenCalledTimes(1);
    expect(mockRequestTextWithLog).toHaveBeenCalledWith('https://lrc.red/s/REL.ttml');
  });

  it('tries the next ranked candidate when a TTML download fails', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: RICK_RESULTS });
    mockRequestTextWithLog.mockResolvedValueOnce(null).mockResolvedValueOnce(WORD_TTML);
    expect(await fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000)).toHaveLength(1);
    expect(mockRequestTextWithLog.mock.calls.map((call) => String(call[0]))).toEqual([
      'https://lrc.red/s/GBARL0600786.ttml',
      'https://lrc.red/s/GBARL9300135.ttml',
    ]);
  });

  it('returns null on empty results and when the request throws', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: [], source: 'MISS-LRC-RED', total: 0 });
    expect(await fetchLyricsFromLrcRed('Nothing', 'Nobody', 100000)).toBeNull();
    mockRequestJsonWithLog.mockRejectedValue(new Error('offline'));
    expect(await fetchLyricsFromLrcRed('Nothing2', 'Nobody', 100000)).toBeNull();
  });

  it('retries with a Simplified query for Traditional titles and accepts the studio version by duration', async () => {
    mockRequestJsonWithLog.mockImplementation((url: string) => Promise.resolve(url.includes('%E5%91%A8%E6%9D%B0%E4%BC%A6')
      ? { results: [item({ id: 'STUDIO', duration: 270, artist_name: '周杰伦', track_name: '晴天', timing_type: 'word' })] }
      : { results: [item({ id: 'LIVE', duration: 299, artist_name: '周杰伦', track_name: '晴天 (Live)', timing_type: 'line' })] }));
    mockRequestTextWithLog.mockResolvedValue(WORD_TTML);
    expect(await fetchLyricsFromLrcRed('晴天', '周杰倫', 269000)).toHaveLength(1);
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(2);
    expect(mockRequestTextWithLog).toHaveBeenCalledWith('https://lrc.red/s/STUDIO.ttml');
  });

  it('caches hits per title, artist and duration, and shares one request between both chains', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: RICK_RESULTS });
    mockRequestTextWithLog.mockResolvedValue(WORD_TTML);
    const [normal, karaoke] = await Promise.all([
      fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000),
      fetchKaraokeFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000),
    ]);
    expect(normal).toHaveLength(1);
    expect(karaoke).toHaveLength(1);
    await fetchLyricsFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000);
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
    expect(mockRequestTextWithLog).toHaveBeenCalledTimes(1);
  });

  it('does not cache a miss', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: [] });
    await fetchLyricsFromLrcRed('Nothing', 'Nobody', 100000);
    const firstRound = mockRequestJsonWithLog.mock.calls.length;
    await Promise.resolve();
    await fetchLyricsFromLrcRed('Nothing', 'Nobody', 100000);
    expect(mockRequestJsonWithLog.mock.calls.length).toBe(firstRound * 2);
  });
});

describe('fetchKaraokeFromLrcRed', () => {
  it('returns syllables for word-level TTML', async () => {
    mockRequestJsonWithLog.mockResolvedValue({ results: RICK_RESULTS });
    mockRequestTextWithLog.mockResolvedValue(WORD_TTML);
    const lines = await fetchKaraokeFromLrcRed('Never Gonna Give You Up', 'Rick Astley', 213000);
    expect(lines?.[0].syllables.map((s) => s.text)).toEqual(['We\'re ', 'no']);
    expect(lines?.[0].time_ms).toBe(18834);
  });

  it('returns null for line-level TTML so the normal chain handles it', async () => {
    mockRequestJsonWithLog.mockResolvedValue({
      results: [item({ id: 'LINE', track_name: '晴天', artist_name: '周杰伦', duration: 250, timing_type: 'line' })],
    });
    mockRequestTextWithLog.mockResolvedValue(LINE_TTML);
    expect(await fetchKaraokeFromLrcRed('晴天', '周杰伦', 250000)).toBeNull();
    expect(await fetchLyricsFromLrcRed('晴天', '周杰伦', 250000)).toEqual([{ time_ms: 310, text: '今天来这边是看我的' }]);
  });
});
