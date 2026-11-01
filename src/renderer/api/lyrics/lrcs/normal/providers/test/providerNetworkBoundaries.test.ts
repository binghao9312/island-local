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
 * @file providerNetworkBoundaries.test.ts
 * @description 酷狗、LRCLIB、网易真实 Provider 网络失败、字段校验与清洗查询回退边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLyricsFromLrclib } from '../lrclib';

const netFetch = vi.fn<(url: string, options?: { body?: string }) => Promise<{ ok: boolean; status: number; body: string }>>();
const response = (value: unknown) => ({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
const lrc = '[00:01.00]Hello';
const expected = [{ time_ms: 1000, text: 'Hello' }];

beforeEach(() => {
  netFetch.mockReset().mockResolvedValue({ ok: false, status: 503, body: '' });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real LRCLIB ordered search fallback', () => {
  it('continues after original and cleaned searches reject, then tries keyword and direct metadata requests', async () => {
    netFetch.mockRejectedValueOnce(new Error('original unavailable'))
      .mockRejectedValueOnce(new Error('cleaned unavailable'))
      .mockRejectedValueOnce(new Error('keyword unavailable'))
      .mockResolvedValueOnce(response({ syncedLyrics: lrc }));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist feat. Guest')).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(4);
    expect(netFetch.mock.calls[3][0]).toContain('/api/get?track_name=Song&artist_name=Artist');
  });

  it('returns null when the final direct request also rejects', async () => {
    netFetch.mockRejectedValue(new Error('network unavailable'));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(4);
  });

  it.each([['Song (Live)', 'Artist'], ['Song', 'Artist feat. Guest']])('uses cleaned search after unusable synced payload %s / %s', async (title, artist) => {
    netFetch.mockResolvedValueOnce(response([{ syncedLyrics: 'untimed' }])).mockResolvedValueOnce(response([{ syncedLyrics: lrc }]));
    expect(await fetchLyricsFromLrclib(title, artist)).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null after keyword and direct payloads contain no synced lyric', async () => {
    netFetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ syncedLyrics: 'untimed' }])).mockResolvedValueOnce(response({ syncedLyrics: 'untimed' }));
    expect(await fetchLyricsFromLrclib('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(3);
    expect(netFetch.mock.calls[1][0]).toContain('/api/search?q=');
    expect(netFetch.mock.calls[2][0]).toContain('/api/get?');
  });

  it('continues to keyword search after an empty cleaned result', async () => {
    netFetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ syncedLyrics: lrc }]));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[2][0]).toContain('/api/search?q=Song%20Artist');
  });
});

