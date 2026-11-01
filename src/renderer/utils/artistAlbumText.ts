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
 * @file artistAlbumText.ts
 * @description 无歌词时歌词区域的回退文案，显示「歌手 · 专辑」，专辑为空时省略
 * @author 鸡哥
 */

/**
 * 拼接歌手与专辑作为无歌词时的回退文案
 * @description 歌词未找到、加载失败、纯音乐或无当前行时使用，不再显示"暂无歌词"类提示
 * @param artist - 歌手名，空或仅含空白时省略
 * @param album - 专辑名，空或仅含空白时省略
 * @returns 形如 "歌手 · 专辑" 的文案；两者都为空时返回空字符串，调用方应不渲染该元素
 */
export function formatArtistAlbum(artist: string | null | undefined, album: string | null | undefined): string {
  return [artist, album]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}
