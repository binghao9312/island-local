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
 * @description IslandTimerRing 渲染测试：显隐类名、dashoffset 进度与过渡开关。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { elements } from '../../states/test/tree';
import type { TreeElement } from '../../states/test/tree';
import { IslandTimerRing } from '../IslandTimerRing';

/**
 * 渲染进度环并取出 svg 与 rect。
 * @param props - 组件参数。
 * @returns svg 与 rect 元素。
 */
function render(props: Parameters<typeof IslandTimerRing>[0]): { svg: TreeElement; rect: TreeElement } {
  const root = IslandTimerRing(props) as TreeElement;
  const [svg, rect] = elements(root);
  return { svg, rect };
}

describe('IslandTimerRing', () => {
  it('is hidden and non-interactive while idle', () => {
    const { svg } = render({ timerState: 'idle', remainingSeconds: 0, totalSeconds: 0, transitionEnabled: true });
    expect(svg.props.className).toBe('island-timer-ring');
    expect(svg.props['aria-hidden']).toBe('true');
  });

  it('shows a nearly full animated ring right after start', () => {
    const { svg, rect } = render({ timerState: 'running', remainingSeconds: 100, totalSeconds: 100, transitionEnabled: true });
    expect(svg.props.className).toBe('island-timer-ring island-timer-ring-visible island-timer-ring-animated');
    expect(rect.props.pathLength).toBe(100);
    expect(rect.props.strokeDasharray).toBe(100);
    expect(rect.props.strokeDashoffset).toBeCloseTo(1, 10);
  });

  it('reaches a fully consumed ring at the last second', () => {
    const { rect } = render({ timerState: 'running', remainingSeconds: 1, totalSeconds: 100, transitionEnabled: true });
    expect(rect.props.strokeDashoffset).toBe(100);
  });

  it('freezes without transition while paused', () => {
    const { svg, rect } = render({ timerState: 'paused', remainingSeconds: 50, totalSeconds: 100, transitionEnabled: true });
    expect(svg.props.className).toBe('island-timer-ring island-timer-ring-visible');
    expect(rect.props.strokeDashoffset).toBe(50);
  });

  it('drops the transition when animations are disabled', () => {
    const { svg } = render({ timerState: 'running', remainingSeconds: 10, totalSeconds: 10, transitionEnabled: false });
    expect(svg.props.className).toBe('island-timer-ring island-timer-ring-visible');
  });
});
