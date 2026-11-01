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
 * @file islandTimerRing.test.tsx
 * @description IslandTimerRing：显隐类名、按帧连续推进与暂停冻结。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render } from '../../states/maxExpand/test/componentHarness';
import { IslandTimerRing } from '../IslandTimerRing';

const clock = { now: 0, frames: [] as FrameRequestCallback[] };

/**
 * 渲染进度环，挂上假 path 并执行 effect。
 * @param props - 组件入参
 * @returns svg 类名与假 path 样式
 */
function mount(props: Parameters<typeof IslandTimerRing>[0]): { className: string; style: Record<string, string> } {
  const tree = render(IslandTimerRing, props);
  const svg = nodes(tree, 'svg')[0];
  const path = nodes(tree, 'path')[0];
  const style: Record<string, string> = {};
  (path.props.ref as { current: unknown }).current = { style };
  flushEffects();
  return { className: String(svg.props.className), style };
}

afterEach(() => {
  vi.unstubAllGlobals();
  clock.now = 0;
  clock.frames = [];
});

describe('IslandTimerRing', () => {
  it('空闲时隐藏', () => {
    expect(mount({ timerState: 'idle', remainingSeconds: 0, totalSeconds: 0, shapeMode: 'pill' }).className).toBe('island-timer-ring');
  });

  it('运行时按帧连续缩短，而不是按秒跳变', () => {
    vi.stubGlobal('performance', { now: () => clock.now });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { clock.frames.push(cb); return clock.frames.length; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { className, style } = mount({ timerState: 'running', remainingSeconds: 10, totalSeconds: 10, shapeMode: 'pill' });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    clock.now = 2500;
    clock.frames.shift()?.(clock.now);
    expect(Number(style.strokeDashoffset)).toBeCloseTo(25, 10);
    clock.now = 2516;
    clock.frames.shift()?.(clock.now);
    expect(Number(style.strokeDashoffset)).toBeCloseTo(25.16, 10);
  });

  it('暂停时不启动逐帧动画', () => {
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { className } = mount({ timerState: 'paused', remainingSeconds: 5, totalSeconds: 10, shapeMode: 'pill' });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    expect(raf).not.toHaveBeenCalled();
  });
});
