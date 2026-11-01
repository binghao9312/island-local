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

import type { IslandShapeMode, TimerState } from '../../store/types';

/** 计时 tick 抖动容差（毫秒），超出则重新校准结束时间 */
const END_AT_DRIFT_TOLERANCE_MS = 1500;

/** 线宽的一半（px），路径向内收进以免被裁切 */
const HALF_STROKE = 1.5;

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
 * 判断歌曲进度环是否应展示。
 * @param songProgressRingEnabled - 歌曲进度环设置开关
 * @param isMusicPlaying - 媒体会话是否激活
 * @param durationMs - 歌曲总时长（毫秒）
 * @returns 歌曲有效且功能开启时为 true
 */
export function isSongRingVisible(
  songProgressRingEnabled: boolean,
  isMusicPlaying: boolean,
  durationMs: number
): boolean {
  return Boolean(songProgressRingEnabled && isMusicPlaying && durationMs > 0);
}

/**
 * 解析进度环颜色。倒计时优先使用琥珀色（#ffb300）；歌曲进度使用专辑主色，全黑或缺失时回退为 70% 白色。
 * @param mode - 进度环模式（'timer' 倒计时 | 'song' 歌曲进度）
 * @param dominantColor - 歌曲专辑主色 RGB 元组
 * @returns CSS 颜色字符串
 */
export function resolveRingColor(
  mode: 'timer' | 'song',
  dominantColor?: [number, number, number] | null
): string {
  if (mode === 'timer') {
    return '#ffb300';
  }
  if (dominantColor && (dominantColor[0] > 0 || dominantColor[1] > 0 || dominantColor[2] > 0)) {
    return `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;
  }
  return 'rgba(255, 255, 255, 0.7)';
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

/**
 * 生成进度线路径。胶囊：从左上圆角后沿顺时针绕一整圈；刘海：从左上往下、沿底边、再往上到右上，不画顶边。
 * @param width - 岛屿宽度（px）
 * @param height - 岛屿高度（px）
 * @param radius - 底部圆角半径（px）
 * @param shapeMode - 岛屿形态
 * @returns SVG path d；尺寸无效时为空串
 */
export function buildTimerRingPath(width: number, height: number, radius: number, shapeMode: IslandShapeMode): string {
  const s = HALF_STROKE;
  const w = width - s;
  const h = height - s;
  if (w <= s || h <= s) return '';
  const r = Math.max(0, Math.min(radius - s, (w - s) / 2, (h - s) / 2));
  if (shapeMode === 'notch') {
    return `M ${s} 0 L ${s} ${h - r} A ${r} ${r} 0 0 0 ${s + r} ${h} L ${w - r} ${h} A ${r} ${r} 0 0 0 ${w} ${h - r} L ${w} 0`;
  }
  return `M ${s + r} ${s} L ${w - r} ${s} A ${r} ${r} 0 0 1 ${w} ${s + r} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h}`
    + ` L ${s + r} ${h} A ${r} ${r} 0 0 1 ${s} ${h - r} L ${s} ${s + r} A ${r} ${r} 0 0 1 ${s + r} ${s} Z`;
}
