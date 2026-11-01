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
 * @file SongQuickToggles.tsx
 * @description 歌曲页快捷开关：收起时显示歌词、外缘歌曲进度线
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import type { ReactElement } from 'react';

/**
 * 歌曲页快捷开关
 * @description 与设置页共用同一份持久化与广播，切换后收起的灵动岛立即生效
 * @returns 两个文字切换按钮
 */
export function SongQuickToggles(): ReactElement {
  const { t } = useTranslation();
  const idleLyrics = useIslandStore((state) => state.lyricsIdleDisplayEnabled);
  const ringEnabled = useIslandStore((state) => state.songProgressRingEnabled);
  const setRingEnabled = useIslandStore((state) => state.setSongProgressRingEnabled);

  const toggleIdleLyrics = (): void => {
    const next = !idleLyrics;
    window.api?.musicLyricsIdleDisplayEnabledSet?.(next)?.catch(() => {});
    window.dispatchEvent?.(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-idle-display-enabled', value: next } }));
  };

  const toggleRing = (): void => {
    const next = !ringEnabled;
    setRingEnabled(next);
    window.dispatchEvent?.(new CustomEvent('island:setting-changed', { detail: { channel: 'music:song-progress-ring-enabled', value: next } }));
  };

  return (
    <div className="ov-quick-toggles">
      <button
        type="button"
        className="ov-quick-toggle"
        aria-pressed={idleLyrics}
        onClick={(e) => { e.stopPropagation(); toggleIdleLyrics(); }}
      >
        {t('songTab.quick.idleLyrics', { defaultValue: '岛上歌词' })}
      </button>
      <button
        type="button"
        className="ov-quick-toggle"
        aria-pressed={ringEnabled}
        onClick={(e) => { e.stopPropagation(); toggleRing(); }}
      >
        {t('songTab.quick.progressRing', { defaultValue: '进度线' })}
      </button>
    </div>
  );
}
