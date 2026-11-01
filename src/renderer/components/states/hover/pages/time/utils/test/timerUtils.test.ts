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
 * @file timerUtils.test.ts
 * @description 计时器输入清洗、上限钳制与总秒数换算测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { clampTimeField, getTotalSeconds, padZero, sanitizeTimeDigits } from '../timerUtils';

describe('sanitizeTimeDigits', () => {
  it.each([['', ''], ['5', '5'], ['12', '12'], ['123', '12'], ['a1b2', '12'], ['-3', '3'], ['abc', '']])('turns %j into %j', (raw, expected) => {
    expect(sanitizeTimeDigits(raw)).toBe(expected);
  });
});

describe('clampTimeField', () => {
  it.each([['', 59, '00'], ['abc', 59, '00'], ['7', 59, '07'], ['59', 59, '59'], ['60', 59, '59'], ['99', 59, '59'], ['24', 23, '23'], ['09', 23, '09']] as const)('clamps %j at max %i to %j', (raw, max, expected) => {
    expect(clampTimeField(raw, max)).toBe(expected);
  });
});

describe('getTotalSeconds', () => {
  it('sums units and treats invalid input as zero', () => {
    expect(getTotalSeconds('01', '02', '03')).toBe(3723);
    expect(getTotalSeconds('bad', '', '')).toBe(0);
    expect(getTotalSeconds('00', '00', '10')).toBe(10);
  });
});

describe('padZero', () => {
  it('pads single digits only', () => {
    expect(padZero(3)).toBe('03');
    expect(padZero(12)).toBe('12');
  });
});
