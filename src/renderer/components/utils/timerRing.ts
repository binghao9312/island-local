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
 * @file timerRing.ts
 * @description 倒计时进度环的进度计算
 * @author 鸡哥
 */

import type { TimerState } from '../../store/types';

/** 进度环渲染参数 */
export interface TimerRingProgress {
  /** 是否显示进度环 */
  visible: boolean;
  /** 剩余比例（0~1），1 为整圈 */
  fraction: number;
  /** 是否带 1 秒线性过渡；暂停时必须冻结，故为 false */
  animated: boolean;
}

/**
 * 计算进度环的剩余比例
 * @description 倒计时每秒才更新一次 remainingSeconds，若直接以剩余比例作为目标，
 * 线性过渡会整体滞后 1 秒；运行中改以"本秒结束时"的比例（remaining - 1）为目标，
 * 使环恰好在归零瞬间走完
 * @param state - 计时器状态
 * @param remainingSeconds - 当前剩余秒数
 * @param totalSeconds - 启动时的总秒数
 * @returns 是否显示、剩余比例与是否启用过渡
 */
export function getTimerRingProgress(state: TimerState, remainingSeconds: number, totalSeconds: number): TimerRingProgress {
  if ((state !== 'running' && state !== 'paused') || totalSeconds <= 0) {
    return { visible: false, fraction: 1, animated: false };
  }
  const running = state === 'running';
  const target = running ? remainingSeconds - 1 : remainingSeconds;
  const fraction = Math.min(1, Math.max(0, target / totalSeconds));
  return { visible: true, fraction, animated: running };
}
