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
 * @description 灵动岛外缘的进度线（倒计时琥珀色，番茄钟番茄红，歌曲进度使用专辑主色或 70% 白），按帧连续缩短；胶囊形态绕一整圈，刘海形态只走左、下、右三边
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type JSX } from 'react';
import useIslandStore from '../../store/slices';
import { POMODORO_DURATIONS } from '../states/expand/pages/OverviewTab/utils/overviewUtils';
import type { IslandShapeMode, TimerState } from '../../store/types';
import {
  buildTimerRingPath,
  getRingDashOffset,
  isPomodoroRingVisible,
  isSongRingVisible,
  isTimerRingVisible,
  resolveRingColor,
  resolveRingEndAt,
} from '../utils/timerRing';

/** 进度线入参 */
export interface IslandTimerRingProps {
  timerState: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  shapeMode: IslandShapeMode;
  /** 番茄钟是否运行（可选覆盖项） */
  pomodoroRunning?: boolean;
  /** 番茄钟剩余秒数（可选覆盖项） */
  pomodoroRemaining?: number;
  /** 番茄钟当前阶段总秒数（可选覆盖项） */
  pomodoroTotalSeconds?: number;
  /** 媒体会话是否激活（可选覆盖项） */
  isMusicPlaying?: boolean;
  /** 是否正在播放（可选覆盖项） */
  isPlaying?: boolean;
  /** 当前播放位置（毫秒，可选覆盖项） */
  currentPositionMs?: number;
  /** 歌曲总时长（毫秒，可选覆盖项） */
  durationMs?: number;
  /** 歌曲专辑主色 RGB（可选覆盖项） */
  dominantColor?: [number, number, number];
  /** 外缘歌曲进度环设置开关（可选覆盖项） */
  songProgressRingEnabled?: boolean;
}

/** 圆角过渡时长（毫秒），过渡结束后重新测量 */
const RADIUS_SETTLE_MS = 450;

/**
 * 渲染灵动岛外缘进度线；优先级为倒计时（琥珀色）> 番茄钟（番茄红）> 歌曲进度；音乐播放时复用同条线展示歌曲剩余进度。
 * @param props - 组件入参
 * @returns 进度线 SVG
 */
export function IslandTimerRing(props: IslandTimerRingProps): JSX.Element {
  const {
    timerState,
    remainingSeconds,
    totalSeconds,
    shapeMode,
    pomodoroRunning: propPomodoroRunning,
    pomodoroRemaining: propPomodoroRemaining,
    pomodoroTotalSeconds: propPomodoroTotalSeconds,
    isMusicPlaying: propIsMusicPlaying,
    isPlaying: propIsPlaying,
    currentPositionMs: propCurrentPositionMs,
    durationMs: propDurationMs,
    dominantColor: propDominantColor,
    songProgressRingEnabled: propSongProgressRingEnabled,
  } = props;

  const storePomodoroRunning = useIslandStore((s) => s.pomodoroRunning);
  const storePomodoroRemaining = useIslandStore((s) => s.pomodoroRemaining);
  const storePomodoroPhase = useIslandStore((s) => s.pomodoroPhase);
  const storeIsMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const storeIsPlaying = useIslandStore((s) => s.isPlaying);
  const storePositionMs = useIslandStore((s) => s.currentPositionMs);
  const storeDurationMs = useIslandStore((s) => s.currentDurationMs || s.mediaInfo.duration_ms);
  const storeDominantColor = useIslandStore((s) => s.dominantColor);
  const storeRingEnabled = useIslandStore((s) => s.songProgressRingEnabled);

  const pomodoroRunning = propPomodoroRunning ?? (storePomodoroRunning ?? false);
  const pomodoroRemaining = propPomodoroRemaining ?? (storePomodoroRemaining ?? 0);
  const pomodoroTotalSeconds = propPomodoroTotalSeconds ?? POMODORO_DURATIONS[storePomodoroPhase ?? 'work'];
  const isMusicPlaying = propIsMusicPlaying ?? storeIsMusicPlaying;
  const isPlaying = propIsPlaying ?? storeIsPlaying;
  const currentPositionMs = propCurrentPositionMs ?? storePositionMs;
  const durationMs = propDurationMs ?? storeDurationMs;
  const dominantColor = propDominantColor ?? storeDominantColor;
  const songProgressRingEnabled = propSongProgressRingEnabled ?? (storeRingEnabled ?? false);

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const endAtRef = useRef<number | null>(null);
  const lastPositionMsRef = useRef<number>(0);
  const lastUpdatePerfMsRef = useRef<number>(0);
  const [pathD, setPathD] = useState('');

  const timerVisible = isTimerRingVisible(timerState, totalSeconds);
  const pomodoroVisible = !timerVisible && isPomodoroRingVisible(pomodoroRunning, pomodoroTotalSeconds);
  const songVisible = !timerVisible && !pomodoroVisible && isSongRingVisible(songProgressRingEnabled, isMusicPlaying, durationMs);
  const visible = timerVisible || pomodoroVisible || songVisible;
  const mode: 'timer' | 'pomodoro' | 'song' = timerVisible ? 'timer' : pomodoroVisible ? 'pomodoro' : 'song';
  const running = timerVisible ? timerState === 'running' : pomodoroVisible ? true : (songVisible && isPlaying);
  /** 倒计时与番茄钟共用的剩余/总秒数 */
  const countdownRemaining = mode === 'pomodoro' ? pomodoroRemaining : remainingSeconds;
  const countdownTotal = mode === 'pomodoro' ? pomodoroTotalSeconds : totalSeconds;
  const ringColor = resolveRingColor(mode, dominantColor);
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
    lastPositionMsRef.current = currentPositionMs;
    lastUpdatePerfMsRef.current = performance.now();
  }, [currentPositionMs, durationMs, isPlaying]);

  useEffect(() => {
    if (!running || mode === 'song') {
      endAtRef.current = null;
      return;
    }
    endAtRef.current = resolveRingEndAt(endAtRef.current, performance.now(), countdownRemaining);
  }, [running, mode, countdownRemaining]);

  useEffect(() => {
    if (!running) return undefined;
    let frameId = 0;
    const draw = (): void => {
      const path = pathRef.current;
      if (!path) return;
      if (mode !== 'song') {
        const endAt = endAtRef.current;
        if (endAt !== null) {
          const leftSeconds = Math.max(0, (endAt - performance.now()) / 1000);
          path.style.strokeDashoffset = String(getRingDashOffset(leftSeconds, countdownTotal));
        }
      } else {
        const elapsed = Math.max(0, performance.now() - lastUpdatePerfMsRef.current);
        const currentPos = Math.min(durationMs, lastPositionMsRef.current + elapsed);
        const leftMs = Math.max(0, durationMs - currentPos);
        path.style.strokeDashoffset = String(getRingDashOffset(leftMs, durationMs));
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [running, mode, countdownTotal, durationMs]);

  const initialDashOffset = visible
    ? (mode !== 'song'
        ? getRingDashOffset(countdownRemaining, countdownTotal)
        : getRingDashOffset(Math.max(0, durationMs - currentPositionMs), durationMs))
    : 0;

  return (
    <svg ref={svgRef} className={`island-timer-ring${visible ? ' island-timer-ring-visible' : ''}`} aria-hidden="true" focusable="false">
      <path
        ref={pathRef}
        d={pathD}
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={initialDashOffset}
        style={{ stroke: ringColor }}
      />
    </svg>
  );
}
