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
 * @description 倒计时进度环计算：显隐、连续偏移与结束时间校准。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getRingDashOffset, isTimerRingVisible, resolveRingEndAt } from '../timerRing';

describe('timerRing', () => {
  it('仅在运行或暂停且总时长有效时显示', () => {
    expect(isTimerRingVisible('idle', 60)).toBe(false);
    expect(isTimerRingVisible('running', 0)).toBe(false);
    expect(isTimerRingVisible('running', 60)).toBe(true);
    expect(isTimerRingVisible('paused', 60)).toBe(true);
  });

  it('偏移随剩余小数秒连续变化并夹紧到 0-100', () => {
    expect(getRingDashOffset(60, 60)).toBe(0);
    expect(getRingDashOffset(45.5, 60)).toBeCloseTo(100 * (14.5 / 60), 10);
    expect(getRingDashOffset(0, 60)).toBe(100);
    expect(getRingDashOffset(-3, 60)).toBe(100);
    expect(getRingDashOffset(500, 60)).toBe(0);
    expect(getRingDashOffset(5, 0)).toBe(100);
  });

  it('tick 抖动内保留结束时间，偏差过大或首次时重新校准', () => {
    expect(resolveRingEndAt(null, 1000, 10)).toBe(11000);
    expect(resolveRingEndAt(11000, 2900, 9)).toBe(11000);
    expect(resolveRingEndAt(11000, 5000, 9)).toBe(14000);
  });
});
