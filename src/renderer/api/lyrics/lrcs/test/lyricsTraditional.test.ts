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
 * @file lyricsTraditional.test.ts
 * @description 歌词简体转台湾繁体测试 — 使用真实 opencc-js 验证转换规则、假名/谚文保护、时间轴不变与开关解析
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  convertKaraokeToTraditional,
  convertLyricsResultToTraditional,
  isTraditionalLanguage,
  shouldConvertLyricsToTraditional,
  toSimplified,
} from '../lyricsTraditional';
import type { KaraokeLine } from '../karaoke/types';
import type { LyricsFetchResult } from '../normal/types';

const result = (texts: string[], translation: string[] | null = null): LyricsFetchResult => ({
  lyrics: texts.map((text, index) => ({ text, time_ms: index * 1000 })),
  translation: translation
    ? { status: 'available', lines: translation.map((text, index) => ({ text, time_ms: index * 1000 })) }
    : { status: 'unsupported', lines: null },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('convertLyricsResultToTraditional', () => {
  it('converts Simplified to Taiwan Traditional with regional vocabulary and keeps timings', async () => {
    const converted = await convertLyricsResultToTraditional(result(['自行车', '我会受不了这样', 'Hello 软件']));
    expect(converted.lyrics.map((line) => line.text)).toEqual(['腳踏車', '我會受不了這樣', 'Hello 軟體']);
    expect(converted.lyrics.map((line) => line.time_ms)).toEqual([0, 1000, 2000]);
  });

  it('also converts Chinese translation lines and leaves the status alone', async () => {
    const converted = await convertLyricsResultToTraditional(result(['hello', '我会'], ['你好', '软件']));
    expect(converted.translation).toEqual({
      status: 'available',
      lines: [{ time_ms: 0, text: '你好' }, { time_ms: 1000, text: '軟體' }],
    });
  });

  it('leaves the whole track untouched when any line contains Japanese kana', async () => {
    const original = result(['この自行车は', '我会受不了这样']);
    expect(await convertLyricsResultToTraditional(original)).toBe(original);
  });

  it('leaves the whole track untouched when any line contains Korean hangul', async () => {
    const original = result(['사랑해 自行车', '我会']);
    expect(await convertLyricsResultToTraditional(original)).toBe(original);
  });

  it('skips tracks without Han characters without touching the converter', async () => {
    const original = result(['Never gonna give you up']);
    expect(await convertLyricsResultToTraditional(original)).toBe(original);
  });
});

describe('convertKaraokeToTraditional', () => {
  const line = (syllables: Array<[number, number, string]>, text?: string): KaraokeLine => ({
    text: text ?? syllables.map((s) => s[2]).join(''),
    time_ms: 5000,
    duration_ms: 3000,
    syllables: syllables.map((s) => ({ text: s[2], start_offset_ms: s[0], duration_ms: s[1] })),
  });

  it('keeps cross-syllable phrase mappings and leaves every timing field unchanged', async () => {
    const source = [line([[0, 400, '软'], [400, 600, '件'], [1000, 500, '自行'], [1500, 500, '车']])];
    const [converted] = await convertKaraokeToTraditional(source);
    expect(converted.text).toBe('軟體腳踏車');
    expect(converted.syllables.map((s) => s.text)).toEqual(['軟', '體', '腳踏', '車']);
    expect(converted.syllables.map((s) => [s.start_offset_ms, s.duration_ms])).toEqual([[0, 400], [400, 600], [1000, 500], [1500, 500]]);
    expect([converted.time_ms, converted.duration_ms]).toEqual([5000, 3000]);
    expect(source[0].syllables[0].text).toBe('软');
  });

  it('falls back to per-syllable conversion when a phrase mapping changes the length', async () => {
    const [converted] = await convertKaraokeToTraditional([line([[0, 300, '互'], [300, 700, '联网']])]);
    expect(converted.syllables.map((s) => s.text)).toEqual(['互', '聯網']);
    expect(converted.syllables.map((s) => [s.start_offset_ms, s.duration_ms])).toEqual([[0, 300], [300, 700]]);
  });

  it('converts line-level entries that have no syllables', async () => {
    const [converted] = await convertKaraokeToTraditional([line([], '我会受不了这样')]);
    expect(converted.text).toBe('我會受不了這樣');
    expect(converted.syllables).toEqual([]);
  });

  it('does not convert tracks containing kana', async () => {
    const source = [line([[0, 500, 'こ'], [500, 500, '车']])];
    expect(await convertKaraokeToTraditional(source)).toBe(source);
  });
});

describe('toSimplified', () => {
  it('converts Traditional queries to Simplified and passes non-Chinese text through', async () => {
    expect(await toSimplified('周杰倫')).toBe('周杰伦');
    expect(await toSimplified('Rick Astley')).toBe('Rick Astley');
  });
});

describe('shouldConvertLyricsToTraditional', () => {
  const stubStorage = (value: string | null): void => {
    vi.stubGlobal('localStorage', { getItem: () => value });
  };

  it('defaults to on only for Traditional Chinese UI languages', () => {
    stubStorage(null);
    expect(['zh-TW', 'zh-Hant', 'zh-HK'].map((lang) => shouldConvertLyricsToTraditional(lang))).toEqual([true, true, true]);
    expect(['zh-CN', 'en-US', 'ja-JP', undefined].map((lang) => shouldConvertLyricsToTraditional(lang))).toEqual([false, false, false, false]);
  });

  it('lets an explicit user setting override the language default in both directions', () => {
    stubStorage('true');
    expect(shouldConvertLyricsToTraditional('en-US')).toBe(true);
    stubStorage('false');
    expect(shouldConvertLyricsToTraditional('zh-TW')).toBe(false);
  });

  it('falls back to the language default when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(shouldConvertLyricsToTraditional('zh-TW')).toBe(true);
    expect(isTraditionalLanguage('zh-CN')).toBe(false);
  });
});
