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
 * @file songQuickToggles.test.tsx
 * @description 歌曲页快捷开关：收起时歌词与外缘进度线的切换与广播。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { nodes, render } from '../../../../../maxExpand/test/componentHarness';
import { SongQuickToggles } from '../SongQuickToggles';

const mocks = vi.hoisted(() => ({ idle: true, ring: false, setRing: vi.fn() }));
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (state: object) => unknown) => selector({
    lyricsIdleDisplayEnabled: mocks.idle,
    songProgressRingEnabled: mocks.ring,
    setSongProgressRingEnabled: mocks.setRing,
  }),
}));

afterEach(() => { vi.unstubAllGlobals(); mocks.setRing.mockReset(); });

/** 点击指定序号的按钮 */
function click(index: number): void {
  const button = nodes(render(SongQuickToggles), 'button')[index];
  (button.props.onClick as (e: { stopPropagation: () => void }) => void)({ stopPropagation: vi.fn() });
}

describe('SongQuickToggles', () => {
  it('反映当前开关状态', () => {
    const buttons = nodes(render(SongQuickToggles), 'button');
    expect(buttons.map((button) => button.props['aria-pressed'])).toEqual([true, false]);
  });

  it('切换收起时歌词：持久化并广播', () => {
    const set = vi.fn(() => Promise.resolve());
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { api: { musicLyricsIdleDisplayEnabledSet: set }, dispatchEvent });
    click(0);
    expect(set).toHaveBeenCalledWith(false);
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({ channel: 'music:lyrics-idle-display-enabled', value: false });
  });

  it('切换外缘进度线：写入 store 并广播', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    click(1);
    expect(mocks.setRing).toHaveBeenCalledWith(true);
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({ channel: 'music:song-progress-ring-enabled', value: true });
  });
});
