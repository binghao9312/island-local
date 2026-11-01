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
 * @file DynamicIslandGuideTypes.ts
 * @description 灵动岛引导流程类型定义
 * @author 鸡哥
 */

import { UPDATES_ENABLED } from '../../shared/updatesConfig';

/** 引导步骤 */
export type GuideStep = 'language' | 'whitelist' | 'smtc' | 'theme' | 'shape' | 'lyricMode' | 'update' | 'github' | 'sponsors' | 'welcome';

/** 引导步骤完整顺序（含更新源步骤） */
const GUIDE_STEP_ORDER: readonly GuideStep[] = [
  'language', 'whitelist', 'smtc', 'theme', 'shape', 'lyricMode', 'update', 'github', 'sponsors', 'welcome',
];

/**
 * 按更新总开关生成实际引导步骤序列
 * @description 更新检测关闭时移除更新源步骤，使步骤总数、进度点与前进/返回顺序保持一致
 * @param updatesEnabled - 是否启用更新检测
 * @returns 有序的引导步骤列表
 */
export function buildGuideSteps(updatesEnabled: boolean): GuideStep[] {
  return GUIDE_STEP_ORDER.filter((step) => updatesEnabled || step !== 'update');
}

/**
 * 获取相邻引导步骤
 * @param steps - 有序步骤列表
 * @param current - 当前步骤
 * @param offset - 偏移量（1 为下一步，-1 为上一步）
 * @returns 相邻步骤；越界或当前步骤不在列表中时返回当前步骤
 */
export function getAdjacentGuideStep(steps: readonly GuideStep[], current: GuideStep, offset: 1 | -1): GuideStep {
  const index = steps.indexOf(current);
  if (index < 0) return current;
  return steps[index + offset] ?? current;
}

/** 当前构建实际使用的引导步骤序列 */
export const GUIDE_STEPS: GuideStep[] = buildGuideSteps(UPDATES_ENABLED);

/** 引导步骤索引映射（随实际步骤序列推导，未启用的步骤无索引） */
export const GUIDE_STEP_INDEX: Partial<Record<GuideStep, number>> = Object.fromEntries(
  GUIDE_STEPS.map((step, index) => [step, index]),
);

/** 引导步骤总数（从实际步骤序列推导，避免遗漏） */
export const GUIDE_STEP_TOTAL = GUIDE_STEPS.length;
