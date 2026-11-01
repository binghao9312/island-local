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
 * @file timerRing.test.ts
 * @description 倒计时进度环进度计算测试：运行/暂停/空闲分支、归零时机与边界钳制。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getTimerRingProgress } from '../timerRing';

describe('getTimerRingProgress', () => {
  it('is hidden for idle timers and for missing totals', () => {
    expect(getTimerRingProgress('idle', 0, 0).visible).toBe(false);
    expect(getTimerRingProgress('idle', 30, 60).visible).toBe(false);
    expect(getTimerRingProgress('running', 30, 0).visible).toBe(false);
    expect(getTimerRingProgress('paused', 30, 0).visible).toBe(false);
  });

  it('starts as a full ring at the first second and animates', () => {
    expect(getTimerRingProgress('running', 60, 60)).toEqual({ visible: true, fraction: 59 / 60, animated: true });
  });

  it('targets the end of the current second so the ring finishes exactly at zero', () => {
    expect(getTimerRingProgress('running', 1, 60)).toEqual({ visible: true, fraction: 0, animated: true });
    expect(getTimerRingProgress('running', 30, 60).fraction).toBeCloseTo(29 / 60, 10);
  });

  it('freezes at the remaining ratio without transition while paused', () => {
    expect(getTimerRingProgress('paused', 30, 60)).toEqual({ visible: true, fraction: 0.5, animated: false });
  });

  it('clamps out-of-range remaining values into 0..1', () => {
    expect(getTimerRingProgress('running', 0, 60).fraction).toBe(0);
    expect(getTimerRingProgress('running', 500, 60).fraction).toBe(1);
    expect(getTimerRingProgress('paused', -5, 60).fraction).toBe(0);
  });
});
