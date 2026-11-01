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
 * @file ytMusicLauncher.ts
 * @description 从灵动岛打开 YouTube Music 桌面版（Chrome 安装的 PWA），找不到时改开网页版
 * @author 鸡哥
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { shell } from 'electron';

/** PWA 在开始菜单生成的快捷方式文件名 */
const SHORTCUT_NAME = 'YouTube Music.lnk';

/** 找不到桌面版时打开的网页地址 */
export const YOUTUBE_MUSIC_WEB_URL = 'https://music.youtube.com';

/**
 * 在开始菜单程序目录下查找 YouTube Music 快捷方式
 * @description 只看根目录与一层子目录（如「Chrome 應用程式」「Chrome Apps」）
 * @param roots - 开始菜单程序目录列表
 * @returns 快捷方式路径，找不到时返回 null
 */
export function findYouTubeMusicShortcut(roots: string[]): string | null {
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const direct = join(root, SHORTCUT_NAME);
    if (existsSync(direct)) return direct;
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const candidate = join(root, entry, SHORTCUT_NAME);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** 当前用户与所有用户的开始菜单程序目录 */
function getStartMenuRoots(): string[] {
  const roots: string[] = [];
  if (process.env.APPDATA) roots.push(join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
  if (process.env.PROGRAMDATA) roots.push(join(process.env.PROGRAMDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
  return roots;
}

/**
 * 打开 YouTube Music：优先桌面版快捷方式，失败时打开网页版
 * @returns 打开的是 'desktop' 还是 'web'
 */
export async function openYouTubeMusic(): Promise<'desktop' | 'web'> {
  const shortcut = findYouTubeMusicShortcut(getStartMenuRoots());
  if (shortcut && (await shell.openPath(shortcut)) === '') return 'desktop';
  await shell.openExternal(YOUTUBE_MUSIC_WEB_URL);
  return 'web';
}
