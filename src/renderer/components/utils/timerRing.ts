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
 * @description 倒计时进度环的进度计算（按结束时间逐帧连续推进）
 * @author 鸡哥
 */

import type { TimerState } from '../../store/types';

/** 计时 tick 抖动容差（毫秒），超出则重新校准结束时间 */
const END_AT_DRIFT_TOLERANCE_MS = 1500;

/**
 * 判断进度环是否显示。
 * @param state - 计时器状态
 * @param totalSeconds - 本次倒计时总秒数
 * @returns 运行或暂停且总时长有效时为 true
 */
export function isTimerRingVisible(state: TimerState, totalSeconds: number): boolean {
  return (state === 'running' || state === 'paused') && totalSeconds > 0;
}

/**
 * 计算剩余时长对应的 stroke-dashoffset（pathLength = 100）。
 * @param leftSeconds - 剩余秒数，可为小数
 * @param totalSeconds - 总秒数
 * @returns 0（满环）到 100（耗尽）之间的偏移
 */
export function getRingDashOffset(leftSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 100;
  const fraction = Math.min(1, Math.max(0, leftSeconds / totalSeconds));
  return 100 * (1 - fraction);
}

/**
 * 根据当前剩余整秒校准结束时间；仅在偏差超过容差时重置，避免每秒 tick 造成回跳。
 * @param prevEndAt - 之前记录的结束时间（毫秒），未记录为 null
 * @param nowMs - 当前时间（毫秒）
 * @param remainingSeconds - store 中的剩余整秒
 * @returns 结束时间（毫秒）
 */
export function resolveRingEndAt(prevEndAt: number | null, nowMs: number, remainingSeconds: number): number {
  const expected = nowMs + remainingSeconds * 1000;
  if (prevEndAt === null || Math.abs(prevEndAt - expected) > END_AT_DRIFT_TOLERANCE_MS) return expected;
  return prevEndAt;
}
