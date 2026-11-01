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
 * @file dynamicIslandGuideTypes.test.ts
 * @description 验证引导步骤序列在更新检测开关两种状态下的内容、顺序与相邻步骤导航。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { GUIDE_STEP_INDEX, GUIDE_STEP_TOTAL, GUIDE_STEPS, buildGuideSteps, getAdjacentGuideStep } from '../DynamicIslandGuideTypes';

const WITHOUT_UPDATE = ['language', 'whitelist', 'smtc', 'theme', 'shape', 'lyricMode', 'github', 'sponsors', 'welcome'];

describe('buildGuideSteps', () => {
  it('启用更新检测时保留更新源步骤并位于歌词模式与开源信息之间', () => {
    const steps = buildGuideSteps(true);
    expect(steps).toHaveLength(10);
    expect(steps.slice(5, 8)).toEqual(['lyricMode', 'update', 'github']);
  });

  it('关闭更新检测时移除更新源步骤并保持其余顺序', () => {
    expect(buildGuideSteps(false)).toEqual(WITHOUT_UPDATE);
  });

  it('当前构建（更新检测关闭）的步骤总数与索引无空洞', () => {
    expect(GUIDE_STEPS).toEqual(WITHOUT_UPDATE);
    expect(GUIDE_STEP_TOTAL).toBe(WITHOUT_UPDATE.length);
    expect(GUIDE_STEP_INDEX.update).toBeUndefined();
    expect(Object.values(GUIDE_STEP_INDEX)).toEqual(WITHOUT_UPDATE.map((_, index) => index));
  });
});

describe('getAdjacentGuideStep', () => {
  it('更新检测关闭时歌词模式与开源信息直接相邻', () => {
    expect(getAdjacentGuideStep(GUIDE_STEPS, 'lyricMode', 1)).toBe('github');
    expect(getAdjacentGuideStep(GUIDE_STEPS, 'github', -1)).toBe('lyricMode');
  });

  it('更新检测开启时经过更新源步骤', () => {
    const steps = buildGuideSteps(true);
    expect(getAdjacentGuideStep(steps, 'lyricMode', 1)).toBe('update');
    expect(getAdjacentGuideStep(steps, 'update', 1)).toBe('github');
    expect(getAdjacentGuideStep(steps, 'github', -1)).toBe('update');
  });

  it('首尾越界与不在序列内的步骤保持原位', () => {
    expect(getAdjacentGuideStep(GUIDE_STEPS, 'language', -1)).toBe('language');
    expect(getAdjacentGuideStep(GUIDE_STEPS, 'welcome', 1)).toBe('welcome');
    expect(getAdjacentGuideStep(GUIDE_STEPS, 'update', 1)).toBe('update');
  });
});
