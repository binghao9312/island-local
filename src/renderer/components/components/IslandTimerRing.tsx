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
 * @description 灵动岛外缘的倒计时进度环（琥珀色），在所有岛屿状态下叠加显示
 * @author 鸡哥
 */

import type { JSX } from 'react';
import type { TimerState } from '../../store/types';
import { getTimerRingProgress } from '../utils/timerRing';

interface IslandTimerRingProps {
  timerState: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  /** 性能模式下关闭过渡，避免额外的合成开销 */
  transitionEnabled: boolean;
}

/**
 * 倒计时进度环
 * @description 通过 pathLength=100 把周长归一化，以 stroke-dashoffset 表示已走过的比例；
 * 圆角由 CSS 变量 --shell-pill-radius 跟随岛屿形态，不参与布局、不拦截鼠标
 * @param props - 计时器状态、剩余/总秒数与过渡开关
 * @returns 覆盖在岛屿外缘的 SVG 进度环
 */
export function IslandTimerRing({ timerState, remainingSeconds, totalSeconds, transitionEnabled }: IslandTimerRingProps): JSX.Element {
  const { visible, fraction, animated } = getTimerRingProgress(timerState, remainingSeconds, totalSeconds);
  const className = `island-timer-ring${visible ? ' island-timer-ring-visible' : ''}${animated && transitionEnabled ? ' island-timer-ring-animated' : ''}`;

  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <rect pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - fraction)} />
    </svg>
  );
}
