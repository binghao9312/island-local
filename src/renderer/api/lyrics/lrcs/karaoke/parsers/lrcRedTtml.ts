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
 * @file lrcRedTtml.ts
 * @description lrc.red TTML 歌词解析器 — 支持逐字（`<span begin end>`）与逐行（仅 `<p begin end>`）两种计时
 *              与 Apple 的 TTML 不同：时间可为纯秒（`18.834`）或 `M:SS.mmm`，且单词之间的空白位于 `<span>` 之外
 * @author 鸡哥
 */

import type { KaraokeLine, KaraokeSyllable } from '../types';

const P_RE = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
const SPAN_RE = /<span\b([^>]*)>([^<]*)<\/span>|([^<]+)/g;
const AUX_SPAN_RE = /<span\b[^>]*ttm:role="x-(?:translation|roman)"[^>]*>[\s\S]*?<\/span>/g;

/**
 * 解析 lrc.red 时间标签
 * @description Apple 解析器只认 `MM:SS` 形式，而 lrc.red 同时使用纯秒（`18.834`）与 `M:SS.mmm`，故单独实现
 * @param tag - 纯秒、MM:SS 或 HH:MM:SS，可带小数秒
 * @returns 毫秒数，无法解析返回 0
 */
function parseTimeMs(tag: string): number {
  const parts = tag.trim().split(':').map(Number);
  if (parts.length < 1 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return 0;
  return Math.round(parts.reduce((total, n) => total * 60 + n, 0) * 1000);
}

/**
 * 解码 TTML 中常见的 XML 实体
 * @param text - 含实体的原文
 * @returns 解码后的文本
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (...match: string[]) => String.fromCodePoint(parseInt(match[1], 16)))
    .replace(/&#(\d+);/g, (...match: string[]) => String.fromCodePoint(Number(match[1])))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&amp;/g, '&');
}

/**
 * 读取 `attr="value"`，要求属性名前是行首或空白，避免 `begin` 误匹配 `in` 之类的后缀
 * @param attrs - 标签属性串
 * @param name - 属性名
 * @returns 属性值，不存在返回 null
 */
function readAttr(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
}

/**
 * 解析单个 `<p>` 内部内容为音节数组
 * @param inner - `<p>` 内部 XML
 * @param lineStart - 行起始毫秒
 * @returns 音节数组，行级 TTML 返回空数组
 */
function parseSyllables(inner: string, lineStart: number): KaraokeSyllable[] {
  const syllables: KaraokeSyllable[] = [];
  const body = inner.replace(AUX_SPAN_RE, '');
  let m: RegExpExecArray | null;
  const re = new RegExp(SPAN_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    if (m[3] !== undefined) {
      // span 之外的纯空白表示前一个词后有空格，保证英文逐字拼接后仍以空格分词
      if (/^\s+$/.test(m[3]) && syllables.length > 0) {
        const last = syllables[syllables.length - 1];
        if (!/\s$/.test(last.text)) last.text += ' ';
      }
      continue;
    }
    const begin = readAttr(m[1], 'begin');
    const end = readAttr(m[1], 'end');
    const text = decodeEntities(m[2]);
    if (begin === null || end === null || !text) continue;
    const start = parseTimeMs(begin);
    syllables.push({
      text,
      start_offset_ms: Math.max(0, start - lineStart),
      duration_ms: Math.max(0, parseTimeMs(end) - start),
    });
  }
  return syllables;
}

/**
 * 解析 lrc.red TTML 为歌词行
 * @param ttml - TTML XML 文本
 * @returns 按时间升序的歌词行；有 `<span>` 时带音节，否则 `syllables` 为空（行级计时）
 */
export function parseLrcRedTtml(ttml: string): KaraokeLine[] {
  if (!ttml) return [];
  const lines: KaraokeLine[] = [];
  const re = new RegExp(P_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(ttml)) !== null) {
    const begin = readAttr(m[1], 'begin');
    if (begin === null) continue;
    const start = parseTimeMs(begin);
    const end = readAttr(m[1], 'end');
    const syllables = parseSyllables(m[2], start);
    if (syllables.length > 0) {
      const last = syllables[syllables.length - 1];
      last.text = last.text.trimEnd();
    }
    const text = syllables.length > 0
      ? syllables.map((s) => s.text).join('')
      : decodeEntities(m[2].replace(AUX_SPAN_RE, '').replace(/<[^>]*>/g, '')).trim();
    if (!text) continue;
    lines.push({
      text,
      syllables,
      time_ms: start,
      duration_ms: end === null ? 0 : Math.max(0, parseTimeMs(end) - start),
    });
  }
  return lines.sort((a, b) => a.time_ms - b.time_ms);
}
