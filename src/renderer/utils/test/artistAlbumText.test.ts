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
 * @file artistAlbumText.test.ts
 * @description 无歌词回退文案「歌手 · 专辑」的拼接与空值省略测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { formatArtistAlbum } from '../artistAlbumText';

describe('formatArtistAlbum', () => {
  it('joins artist and album with a middle dot', () => {
    expect(formatArtistAlbum('Singer', 'Album')).toBe('Singer · Album');
  });

  it('omits the album when it is empty or whitespace', () => {
    expect(formatArtistAlbum('Singer', '')).toBe('Singer');
    expect(formatArtistAlbum('Singer', '   ')).toBe('Singer');
    expect(formatArtistAlbum('Singer', null)).toBe('Singer');
  });

  it('omits the artist when it is empty and keeps the album', () => {
    expect(formatArtistAlbum('', 'Album')).toBe('Album');
    expect(formatArtistAlbum(undefined, 'Album')).toBe('Album');
  });

  it('returns an empty string when both fields are missing', () => {
    expect(formatArtistAlbum('', '')).toBe('');
    expect(formatArtistAlbum(null, undefined)).toBe('');
  });

  it('trims surrounding whitespace from each field', () => {
    expect(formatArtistAlbum('  Singer  ', ' Album ')).toBe('Singer · Album');
  });
});
