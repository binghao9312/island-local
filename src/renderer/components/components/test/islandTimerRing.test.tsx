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

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {} }));
});

vi.mock('../../../store/slices', () => {
  const store = {
    isMusicPlaying: false,
    isPlaying: false,
    currentPositionMs: 0,
    currentDurationMs: 0,
    mediaInfo: { duration_ms: 0 },
    dominantColor: [0, 0, 0] as [number, number, number],
    songProgressRingEnabled: true,
  };
  const useIslandStore = (selector: (s: typeof store) => unknown) => selector(store);
  useIslandStore.getState = () => store;
  return { default: useIslandStore, useIslandStore };
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render } from '../../states/maxExpand/test/componentHarness';
import { IslandTimerRing } from '../IslandTimerRing';

const clock = { now: 0, frames: [] as FrameRequestCallback[] };

/**
 * 渲染进度环，挂上假 path 并执行 effect。
 * @param props - 组件入参
 * @returns svg 类名与假 path 样式及属性
 */
function mount(props: Parameters<typeof IslandTimerRing>[0]): {
  className: string;
  style: Record<string, string>;
  pathStyle: Record<string, unknown>;
  pathProps: Record<string, unknown>;
} {
  const tree = render(IslandTimerRing, props);
  const svg = nodes(tree, 'svg')[0];
  const path = nodes(tree, 'path')[0];
  const style: Record<string, string> = {};
  (path.props.ref as { current: unknown }).current = { style };
  flushEffects();
  return {
    className: String(svg.props.className),
    style,
    pathStyle: (path.props.style as Record<string, unknown>) || {},
    pathProps: path.props as Record<string, unknown>,
  };
}

beforeEach(() => {
  clock.now = 0;
  clock.frames = [];
  vi.stubGlobal('performance', { now: () => clock.now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { clock.frames.push(cb); return clock.frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

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

  it('歌曲播放时显示进度环并应用专辑主色', () => {
    const { className, pathStyle, pathProps } = mount({
      timerState: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: true,
      currentPositionMs: 20000,
      durationMs: 100000,
      dominantColor: [40, 80, 120],
      songProgressRingEnabled: true,
    });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    expect(pathStyle.stroke).toBe('rgb(40, 80, 120)');
    expect(Number(pathProps.strokeDashoffset)).toBeCloseTo(20, 5);
  });

  it('歌曲无主色（[0, 0, 0]）时回退至 70% 白', () => {
    const { className, pathStyle } = mount({
      timerState: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: true,
      currentPositionMs: 0,
      durationMs: 100000,
      dominantColor: [0, 0, 0],
      songProgressRingEnabled: true,
    });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    expect(pathStyle.stroke).toBe('rgba(255, 255, 255, 0.7)');
  });

  it('歌曲暂停时冻结进度，不启动逐帧动画', () => {
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { className, pathProps } = mount({
      timerState: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: false,
      currentPositionMs: 30000,
      durationMs: 100000,
      songProgressRingEnabled: true,
    });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    expect(Number(pathProps.strokeDashoffset)).toBeCloseTo(30, 5);
    expect(raf).not.toHaveBeenCalled();
  });

  it('歌曲播放时按帧从当前位置平滑推进', () => {
    vi.stubGlobal('performance', { now: () => clock.now });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { clock.frames.push(cb); return clock.frames.length; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { className, style } = mount({
      timerState: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: true,
      currentPositionMs: 10000,
      durationMs: 100000,
      songProgressRingEnabled: true,
    });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    clock.now = 5000;
    clock.frames.shift()?.(clock.now);
    expect(Number(style.strokeDashoffset)).toBeCloseTo(15, 5);
  });

  it('倒计时运行时优先级高于歌曲进度，展示琥珀色环', () => {
    const { className, pathStyle, pathProps } = mount({
      timerState: 'running',
      remainingSeconds: 30,
      totalSeconds: 60,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: true,
      currentPositionMs: 10000,
      durationMs: 100000,
      dominantColor: [12, 34, 56],
      songProgressRingEnabled: true,
    });
    expect(className).toBe('island-timer-ring island-timer-ring-visible');
    expect(pathStyle.stroke).toBe('#ffb300');
    expect(Number(pathProps.strokeDashoffset)).toBeCloseTo(50, 5);
  });

  it('歌曲进度环设置关闭时不展示歌曲环', () => {
    const { className } = mount({
      timerState: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      shapeMode: 'pill',
      isMusicPlaying: true,
      isPlaying: true,
      currentPositionMs: 10000,
      durationMs: 100000,
      songProgressRingEnabled: false,
    });
    expect(className).toBe('island-timer-ring');
  });
});
