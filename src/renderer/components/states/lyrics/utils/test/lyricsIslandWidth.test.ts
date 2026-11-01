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
 * @file lyricsIslandWidth.test.ts
 * @description 歌词灵动岛宽度纯函数的内容宽度、钳制区间、凹角刘海内边距与非歌词状态回退测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { LYRICS_MAIN_FONT } from '../../config/lyricsConstants';
import {
  computeLyricsIslandWidth,
  measureLyricsContentWidth,
  measureLyricsTextWidth,
  resolveLyricsShellWidth,
} from '../lyricsIslandWidth';

describe('measureLyricsContentWidth', () => {
  it('累加封面、两侧内边距与行间距，无时钟时不计入时钟占位', () => {
    expect(measureLyricsContentWidth({ textWidth: 100, clockWidth: null })).toBe(170);
  });

  it('时钟显示时计入左外边距、时钟宽度与行间距', () => {
    expect(measureLyricsContentWidth({ textWidth: 100, clockWidth: 30 })).toBe(212);
  });
});

describe('measureLyricsTextWidth', () => {
  it('空文本宽度为 0', () => {
    expect(measureLyricsTextWidth('', LYRICS_MAIN_FONT)).toBe(0);
  });

  it('无 canvas 环境时按拉丁字符与 CJK 字符分别估算宽度', () => {
    expect(measureLyricsTextWidth('abcd', LYRICS_MAIN_FONT)).toBeCloseTo(28.6, 5);
    expect(measureLyricsTextWidth('中文', LYRICS_MAIN_FONT)).toBeCloseTo(26, 5);
    expect(measureLyricsTextWidth('a中', LYRICS_MAIN_FONT)).toBeCloseTo(20.15, 5);
  });
});

describe('computeLyricsIslandWidth', () => {
  it('内容窄于收起态宽度时钳制到最小宽度', () => {
    expect(computeLyricsIslandWidth({ contentWidth: 170, shellInset: 0, minWidth: 260, maxWidth: 500 })).toBe(260);
  });

  it('内容宽于原歌词宽度时钳制到最大宽度，超长歌词沿用滚动', () => {
    expect(computeLyricsIslandWidth({ contentWidth: 600, shellInset: 0, minWidth: 260, maxWidth: 500 })).toBe(500);
  });

  it('区间内按内容宽度加壳层内边距并向上取整为整像素', () => {
    expect(computeLyricsIslandWidth({ contentWidth: 400, shellInset: 32, minWidth: 260, maxWidth: 500 })).toBe(432);
    expect(computeLyricsIslandWidth({ contentWidth: 432.2, shellInset: 0, minWidth: 260, maxWidth: 500 })).toBe(433);
  });
});

describe('resolveLyricsShellWidth', () => {
  it('非歌词状态或尚未测量时返回 null，由样式表回退', () => {
    expect(resolveLyricsShellWidth({ state: 'hover', contentWidth: 400, shapeMode: 'notch', cornerStyle: 'rounded' })).toBeNull();
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: null, shapeMode: 'notch', cornerStyle: 'rounded' })).toBeNull();
  });

  it('歌词与翻译歌词状态使用同一套收缩规则', () => {
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: 400, shapeMode: 'pill', cornerStyle: 'rounded' })).toBe(400);
    expect(resolveLyricsShellWidth({ state: 'lyricsTranslation', contentWidth: 400, shapeMode: 'pill', cornerStyle: 'rounded' })).toBe(400);
  });

  it('凹角刘海计入壳层两侧各 16px 内边距，其它形态不计入', () => {
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: 400, shapeMode: 'notch', cornerStyle: 'concave' })).toBe(432);
    expect(resolveLyricsShellWidth({ state: 'lyricsTranslation', contentWidth: 400, shapeMode: 'notch', cornerStyle: 'concave' })).toBe(432);
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: 400, shapeMode: 'pill', cornerStyle: 'concave' })).toBe(400);
  });

  it('收起态宽度为下限、原歌词宽度为上限', () => {
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: 100, shapeMode: 'notch', cornerStyle: 'rounded' })).toBe(260);
    expect(resolveLyricsShellWidth({ state: 'lyrics', contentWidth: 900, shapeMode: 'notch', cornerStyle: 'rounded' })).toBe(500);
  });
});
