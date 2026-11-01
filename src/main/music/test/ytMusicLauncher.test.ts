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
 * @file ytMusicLauncher.test.ts
 * @description YouTube Music 快捷方式查找：根目录、一层子目录与找不到的情况
 * @author 鸡哥
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ shell: { openPath: vi.fn(), openExternal: vi.fn() } }));

const { findYouTubeMusicShortcut } = await import('../ytMusicLauncher');

const created: string[] = [];

/** 建立临时开始菜单目录 */
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ytm-'));
  created.push(root);
  return root;
}

afterEach(() => {
  created.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

describe('findYouTubeMusicShortcut', () => {
  it('finds the shortcut inside a Chrome apps subfolder', () => {
    const root = makeRoot();
    mkdirSync(join(root, 'Chrome 應用程式'));
    writeFileSync(join(root, 'Chrome 應用程式', 'YouTube Music.lnk'), '');
    expect(findYouTubeMusicShortcut([root])).toBe(join(root, 'Chrome 應用程式', 'YouTube Music.lnk'));
  });

  it('prefers a shortcut directly in the root', () => {
    const root = makeRoot();
    writeFileSync(join(root, 'YouTube Music.lnk'), '');
    expect(findYouTubeMusicShortcut([join(root, 'missing'), root])).toBe(join(root, 'YouTube Music.lnk'));
  });

  it('returns null when nothing is installed', () => {
    expect(findYouTubeMusicShortcut([makeRoot()])).toBeNull();
  });
});
