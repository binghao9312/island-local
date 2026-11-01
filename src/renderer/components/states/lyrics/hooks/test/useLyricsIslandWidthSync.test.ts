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
 * @file useLyricsIslandWidthSync.test.ts
 * @description 歌词宽度测量 Hook 的依赖范围、原文/译文/时钟组合测量与状态写入去重测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLayoutEffect } from 'react';
import useIslandStore from '../../../../../store/slices';
import { useLyricsIslandWidthSync } from '../useLyricsIslandWidthSync';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), useLayoutEffect: vi.fn() }));

beforeEach(() => {
  vi.mocked(useLayoutEffect).mockClear();
  useIslandStore.setState({ lyricsContentWidth: null });
});

/**
 * 执行最近一次注册的 layout effect，并返回其依赖数组。
 * @returns 本次注册的依赖数组。
 */
function runLatestEffect(): readonly unknown[] | undefined {
  const calls = vi.mocked(useLayoutEffect).mock.calls;
  const [effect, dependencies] = calls[calls.length - 1];
  effect();
  return dependencies;
}

describe('useLyricsIslandWidthSync', () => {
  it('原文与北京时间同时显示时写入内容自然宽度，依赖为显示文本', () => {
    useLyricsIslandWidthSync({ lineText: 'abcd', translationText: '', clockText: '12:34' });
    const dependencies = runLatestEffect();
    expect(dependencies).toEqual(['abcd', '', '12:34']);
    // 原文 4 个拉丁字符 28.6 + 时钟 5 个字符 35.75 + 封面、内边距与间距 70 + 时钟占位 12
    expect(useIslandStore.getState().lyricsContentWidth).toBeCloseTo(146.35, 5);
  });

  it('翻译行较宽时取原文与译文的较大宽度，关闭时钟后不计入时钟占位', () => {
    useLyricsIslandWidthSync({ lineText: 'a', translationText: 'abcdefghij', clockText: '' });
    runLatestEffect();
    // 译文 10 个字符 * 11px * 0.55 = 60.5，大于原文 7.15；无时钟时仅计封面与内边距 70
    expect(useIslandStore.getState().lyricsContentWidth).toBeCloseTo(130.5, 5);
  });

  it('无文本时只保留封面与内边距，宽度交由收起态下限钳制', () => {
    useLyricsIslandWidthSync({ lineText: '', translationText: '', clockText: '' });
    runLatestEffect();
    expect(useIslandStore.getState().lyricsContentWidth).toBe(70);
  });

  it('宽度值变化时才通知订阅者，同一宽度重复写入不触发更新', () => {
    const listener = vi.fn();
    const unsubscribe = useIslandStore.subscribe(listener);
    useIslandStore.getState().setLyricsContentWidth(120);
    useIslandStore.getState().setLyricsContentWidth(120);
    useIslandStore.getState().setLyricsContentWidth(null);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
