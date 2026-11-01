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
 * @file IslandTimerRing.tsx
 * @description 灵动岛外缘的倒计时进度环（琥珀色），在所有岛屿状态下叠加显示，按帧连续缩短
 * @author 鸡哥
 */

import { useEffect, useRef, type JSX } from 'react';
import type { TimerState } from '../../store/types';
import { getRingDashOffset, isTimerRingVisible, resolveRingEndAt } from '../utils/timerRing';

/** 进度环入参 */
interface IslandTimerRingProps {
  timerState: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
}

/**
 * 渲染倒计时进度环；运行时用 requestAnimationFrame 按结束时间连续推进，暂停时冻结在当前位置。
 * @param props - 组件入参
 * @param props.timerState - 计时器状态
 * @param props.remainingSeconds - 剩余整秒
 * @param props.totalSeconds - 总秒数
 * @returns 进度环 SVG
 */
export function IslandTimerRing({ timerState, remainingSeconds, totalSeconds }: IslandTimerRingProps): JSX.Element {
  const rectRef = useRef<SVGRectElement>(null);
  const endAtRef = useRef<number | null>(null);
  const visible = isTimerRingVisible(timerState, totalSeconds);
  const running = visible && timerState === 'running';

  useEffect(() => {
    if (!running) {
      endAtRef.current = null;
      return;
    }
    endAtRef.current = resolveRingEndAt(endAtRef.current, performance.now(), remainingSeconds);
  }, [running, remainingSeconds]);

  useEffect(() => {
    if (!running) return undefined;
    let frameId = 0;
    const draw = (): void => {
      const rect = rectRef.current;
      const endAt = endAtRef.current;
      if (rect && endAt !== null) {
        const leftSeconds = Math.max(0, (endAt - performance.now()) / 1000);
        rect.style.strokeDashoffset = String(getRingDashOffset(leftSeconds, totalSeconds));
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [running, totalSeconds]);

  return (
    <svg className={`island-timer-ring${visible ? ' island-timer-ring-visible' : ''}`} aria-hidden="true" focusable="false">
      <rect
        ref={rectRef}
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={visible ? getRingDashOffset(remainingSeconds, totalSeconds) : 0}
      />
    </svg>
  );
}
