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
 * @file lrcRedTtml.test.ts
 * @description lrc.red TTML 解析器测试 — 使用 lrc.red 真实响应结构的逐字与逐行样例
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseLrcRedTtml } from '../lrcRedTtml';

/** 逐字样例（节选自 Rick Astley - Never Gonna Give You Up 的真实 TTML 结构） */
const WORD_TTML = '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:lrc="http://lrc.red/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" lrc:timing="Word" xml:lang="en"><head><metadata><ttm:agent type="person" xml:id="v1"/></metadata></head><body dur="3:33.107"><div begin="18.834" end="34.908" lrc:songPart="Verse"><p begin="18.834" end="22.088" lrc:key="L1" ttm:agent="v1"><span begin="18.834" end="19.086">We&apos;re</span> <span begin="19.086" end="19.336">no</span> <span begin="19.336" end="19.870">strangers</span> <span begin="19.870" end="20.120">to</span> <span begin="20.120" end="22.088">love</span></p><p begin="22.825" end="26.870" lrc:key="L2" ttm:agent="v1"><span begin="22.825" end="23.057">You</span> <span begin="23.057" end="23.324">know</span></p></div></body></tt>';

/** 逐行样例（节选自周杰倫「晴天 (Live)」的真实 TTML 结构，时间含 M:SS.mmm） */
const LINE_TTML = '<tt xmlns="http://www.w3.org/ns/ttml" lrc:timing="Line" xml:lang="zh-Hant"><body dur="4:59.109"><div begin="0.310" end="27.928" lrc:songPart="Intro"><p begin="0.310" end="3.719" lrc:key="L1" ttm:agent="v1">今天來這邊是看我的 還是看南拳媽媽啊</p></div><div begin="1:02.092" end="1:15.641"><p begin="1:02.092" end="1:05.401" lrc:key="L7" ttm:agent="v1">故事的小黃花</p></div></body></tt>';

describe('parseLrcRedTtml', () => {
  it('parses word-level timing with plain-second times, entities and inter-word spaces', () => {
    const lines = parseLrcRedTtml(WORD_TTML);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      time_ms: 18834,
      duration_ms: 3254,
      text: 'We\'re no strangers to love',
      syllables: [
        { start_offset_ms: 0, duration_ms: 252, text: 'We\'re ' },
        { start_offset_ms: 252, duration_ms: 250, text: 'no ' },
        { start_offset_ms: 502, duration_ms: 534, text: 'strangers ' },
        { start_offset_ms: 1036, duration_ms: 250, text: 'to ' },
        { start_offset_ms: 1286, duration_ms: 1968, text: 'love' },
      ],
    });
    expect(lines[1].text).toBe('You know');
  });

  it('parses line-level timing with M:SS.mmm times and no syllables', () => {
    expect(parseLrcRedTtml(LINE_TTML)).toEqual([
      { time_ms: 310, duration_ms: 3409, text: '今天來這邊是看我的 還是看南拳媽媽啊', syllables: [] },
      { time_ms: 62092, duration_ms: 3309, text: '故事的小黃花', syllables: [] },
    ]);
  });

  it('skips translation spans, empty lines and lines without a start time, and sorts by time', () => {
    const ttml = '<tt><body><div>'
      + '<p begin="5.000" end="6.000"><span begin="5.000" end="6.000">B</span><span ttm:role="x-translation">ignored</span></p>'
      + '<p begin="1.000" end="2.000"><span begin="1.000" end="2.000">A</span></p>'
      + '<p begin="3.000" end="4.000"></p>'
      + '<p end="9.000">no start</p>'
      + '</div></body></tt>';
    expect(parseLrcRedTtml(ttml).map((line) => [line.time_ms, line.text])).toEqual([[1000, 'A'], [5000, 'B']]);
  });

  it('returns an empty list for empty or non-TTML input', () => {
    expect(parseLrcRedTtml('')).toEqual([]);
    expect(parseLrcRedTtml('not xml')).toEqual([]);
  });
});
