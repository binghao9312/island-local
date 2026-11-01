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
 * @file lyricsTraditional.ts
 * @description 歌词简体 → 台湾繁体（含词汇）转换 — 基于 opencc-js（懒加载 + 实例缓存）
 *              仅改写文本，不触碰任何时间字段；含日文假名/韩文谚文的歌曲整体跳过，避免破坏日文汉字
 * @author 鸡哥
 */

import i18n from 'i18next';
import { loadLyricsConvertToTraditional } from '../../../store/utils/storage';
import type { KaraokeLine } from './karaoke/types';
import type { LyricsFetchResult } from './normal/types';

type ConvertFn = (text: string) => string;

const HAN_RE = /[㐀-䶿一-鿿豈-﫿]/;
const KANA_HANGUL_RE = /[぀-ヿㇰ-ㇿᄀ-ᇿ㄰-㆏가-힯]/;
const TRADITIONAL_LANGUAGES = new Set(['zh-TW', 'zh-Hant', 'zh-HK', 'zh-MO']);

let cn2twpPromise: Promise<ConvertFn> | null = null;
let t2cnPromise: Promise<ConvertFn> | null = null;

/**
 * 判断界面语言是否为繁体中文
 * @param language - i18next 语言代码，如 `zh-TW`
 * @returns 是繁体中文返回 true
 */
export function isTraditionalLanguage(language: string | undefined): boolean {
  return language !== undefined && TRADITIONAL_LANGUAGES.has(language);
}

/**
 * 解析「歌词转繁体」的最终开关
 * @description 用户显式设置优先；未设置时仅在界面语言为繁体中文时默认开启
 * @param language - 当前界面语言，缺省读取 i18next 当前语言
 * @returns 是否需要转换
 */
export function shouldConvertLyricsToTraditional(language: string | undefined = i18n.resolvedLanguage ?? i18n.language): boolean {
  return loadLyricsConvertToTraditional() ?? isTraditionalLanguage(language);
}

/**
 * 懒加载并缓存简体 → 台湾繁体转换器；加载失败时清空缓存以便下次重试
 * @returns 转换函数
 */
function loadCn2Twp(): Promise<ConvertFn> {
  cn2twpPromise ??= (async (): Promise<ConvertFn> => {
    try {
      const { Converter } = await import('opencc-js/cn2t');
      return Converter({ from: 'cn', to: 'twp' });
    } catch (error) {
      cn2twpPromise = null;
      throw error;
    }
  })();
  return cn2twpPromise;
}

/**
 * 懒加载并缓存繁体 → 简体转换器，仅用于把繁体查询词换成 lrc.red 更容易命中的简体
 * @returns 转换函数
 */
function loadT2cn(): Promise<ConvertFn> {
  t2cnPromise ??= (async (): Promise<ConvertFn> => {
    try {
      const { Converter } = await import('opencc-js/t2cn');
      return Converter({ from: 'tw', to: 'cn' });
    } catch (error) {
      t2cnPromise = null;
      throw error;
    }
  })();
  return t2cnPromise;
}

/**
 * 将繁体文本转换为简体，用于生成备用搜索词
 * @param text - 原文
 * @returns 简体文本；不含汉字或转换器加载失败时返回原文
 */
export async function toSimplified(text: string): Promise<string> {
  if (!HAN_RE.test(text)) return text;
  try {
    return (await loadT2cn())(text);
  } catch {
    return text;
  }
}

/**
 * 判断一批歌词文本是否含日文假名或韩文谚文
 * @param texts - 歌词文本集合
 * @returns 含有时返回 true
 */
function hasKanaOrHangul(texts: string[]): boolean {
  return texts.some((text) => KANA_HANGUL_RE.test(text));
}

/**
 * 转换单段文本；不含汉字的文本直接返回，避免无谓的字典查询
 * @param convert - 转换函数
 * @param text - 原文
 * @returns 转换后的文本
 */
function convertText(convert: ConvertFn, text: string): string {
  return HAN_RE.test(text) ? convert(text) : text;
}

/**
 * 转换一行逐字歌词
 * @description 先整行转换以保留「软件→軟體」这类跨音节词组映射，再按原音节字数切回；
 *              若转换改变了字数则退回逐音节转换，保证时间轴不受影响
 * @param convert - 转换函数
 * @param line - 原歌词行
 * @returns 文本已转换、时间字段保持不变的新歌词行
 */
function convertKaraokeLine(convert: ConvertFn, line: KaraokeLine): KaraokeLine {
  if (line.syllables.length === 0) return { ...line, text: convertText(convert, line.text) };

  const joined = line.syllables.map((s) => s.text).join('');
  const whole = convertText(convert, joined);
  const wholeChars = Array.from(whole);
  const sameLength = wholeChars.length === Array.from(joined).length;

  let cursor = 0;
  const convertedSyllables = line.syllables.map((s) => {
    if (!sameLength) return { ...s, text: convertText(convert, s.text) };
    const size = Array.from(s.text).length;
    const converted = wholeChars.slice(cursor, cursor + size).join('');
    cursor += size;
    return { ...s, text: converted };
  });
  const lineText = line.text === joined && sameLength ? whole : convertText(convert, line.text);
  return { ...line, text: lineText, syllables: convertedSyllables };
}

/**
 * 将普通歌词（及中文翻译）转换为台湾繁体
 * @param result - 原歌词结果
 * @returns 转换后的新结果；含假名/谚文、无汉字或转换器不可用时返回原对象
 */
export async function convertLyricsResultToTraditional(result: LyricsFetchResult): Promise<LyricsFetchResult> {
  const texts = result.lyrics.map((line) => line.text);
  if (hasKanaOrHangul(texts) || !texts.some((text) => HAN_RE.test(text))) return result;
  try {
    const convert = await loadCn2Twp();
    const { lines } = result.translation;
    return {
      lyrics: result.lyrics.map((line) => ({ ...line, text: convertText(convert, line.text) })),
      translation: {
        ...result.translation,
        lines: lines ? lines.map((line) => ({ ...line, text: convertText(convert, line.text) })) : lines,
      },
    };
  } catch {
    return result;
  }
}

/**
 * 将逐字歌词转换为台湾繁体
 * @param lines - 原逐字歌词行
 * @returns 转换后的新歌词行；含假名/谚文、无汉字或转换器不可用时返回原数组
 */
export async function convertKaraokeToTraditional(lines: KaraokeLine[]): Promise<KaraokeLine[]> {
  const texts = lines.map((line) => line.text);
  if (hasKanaOrHangul(texts) || !texts.some((text) => HAN_RE.test(text))) return lines;
  try {
    const convert = await loadCn2Twp();
    return lines.map((line) => convertKaraokeLine(convert, line));
  } catch {
    return lines;
  }
}
