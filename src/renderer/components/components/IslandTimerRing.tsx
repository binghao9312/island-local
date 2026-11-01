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
 * @description 灵动岛外缘的倒计时进度线（琥珀色），按帧连续缩短；胶囊形态绕一整圈，刘海形态只走左、下、右三边
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type JSX } from 'react';
import type { IslandShapeMode, TimerState } from '../../store/types';
import { buildTimerRingPath, getRingDashOffset, isTimerRingVisible, resolveRingEndAt } from '../utils/timerRing';

/** 进度线入参 */
interface IslandTimerRingProps {
  timerState: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  shapeMode: IslandShapeMode;
}

/** 圆角过渡时长（毫秒），过渡结束后重新测量 */
const RADIUS_SETTLE_MS = 450;

/**
 * 渲染倒计时进度线；运行时用 requestAnimationFrame 按结束时间连续推进，暂停时冻结在当前位置。
 * @param props - 组件入参
 * @param props.timerState - 计时器状态
 * @param props.remainingSeconds - 剩余整秒
 * @param props.totalSeconds - 总秒数
 * @param props.shapeMode - 岛屿形态（notch 不画顶边）
 * @returns 进度线 SVG
 */
export function IslandTimerRing({ timerState, remainingSeconds, totalSeconds, shapeMode }: IslandTimerRingProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const endAtRef = useRef<number | null>(null);
  const [pathD, setPathD] = useState('');
  const visible = isTimerRingVisible(timerState, totalSeconds);
  const running = visible && timerState === 'running';

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !visible) return undefined;
    let settleTimer = 0;
    const measure = (): void => {
      const shell = svg.parentElement;
      const { width, height } = svg.getBoundingClientRect();
      const radius = shell ? parseFloat(getComputedStyle(shell).borderBottomLeftRadius) || 0 : 0;
      setPathD(buildTimerRingPath(width, height, radius, shapeMode));
    };
    const remeasure = (): void => {
      measure();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(measure, RADIUS_SETTLE_MS);
    };
    remeasure();
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(svg);
    const classObserver = new MutationObserver(remeasure);
    if (svg.parentElement) classObserver.observe(svg.parentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.clearTimeout(settleTimer);
      resizeObserver.disconnect();
      classObserver.disconnect();
    };
  }, [visible, shapeMode]);

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
      const path = pathRef.current;
      const endAt = endAtRef.current;
      if (path && endAt !== null) {
        const leftSeconds = Math.max(0, (endAt - performance.now()) / 1000);
        path.style.strokeDashoffset = String(getRingDashOffset(leftSeconds, totalSeconds));
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [running, totalSeconds]);

  return (
    <svg ref={svgRef} className={`island-timer-ring${visible ? ' island-timer-ring-visible' : ''}`} aria-hidden="true" focusable="false">
      <path
        ref={pathRef}
        d={pathD}
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={visible ? getRingDashOffset(remainingSeconds, totalSeconds) : 0}
      />
    </svg>
  );
}
