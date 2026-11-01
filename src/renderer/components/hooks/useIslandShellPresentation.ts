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
 * @file useIslandShellPresentation.ts
 * @description 灵动岛壳层 className 与样式计算 Hook。
 * @author 鸡哥
 */

import { useMemo } from 'react';
import { getStateClassName } from '../config/dynamicIslandConfig';
import { useIslandCornerStyle } from './useIslandCornerStyle';
import { resolveLyricsShellWidth } from '../states/lyrics/utils/lyricsIslandWidth';
import type { IslandShapeMode } from '../../store/types';

interface UseIslandShellPresentationOptions {
  state: string;
  morphing: boolean;
  fromState: string;
  showGlow: string | null;
  springAnimation: boolean;
  animationSpeed: string;
  shapeMode: IslandShapeMode;
  dominantColor: [number, number, number];
  /** 歌词内容测量宽度（像素），歌词状态下用于收缩壳层；未测量或非歌词状态为 null */
  lyricsContentWidth?: number | null;
}

interface IslandShellPresentationState {
  shellClassName: string;
  shellStyle: React.CSSProperties | undefined;
}

/**
 * @description 计算灵动岛壳层展示所需类名与样式。
 * @param options - 壳层展示计算参数。
 * @returns 壳层 className 与 style。
 */
export function useIslandShellPresentation(options: UseIslandShellPresentationOptions): IslandShellPresentationState {
  const [cornerStyle] = useIslandCornerStyle();
  const {
    state,
    morphing,
    fromState,
    showGlow,
    springAnimation,
    animationSpeed,
    shapeMode,
    dominantColor,
    lyricsContentWidth = null,
  } = options;

  const shellClassName = useMemo(() => {
    return `island-shell shape-${shapeMode} corners-${cornerStyle} ${getStateClassName(state as Parameters<typeof getStateClassName>[0]) || 'idle'}${morphing ? ' morphing' : ''}${fromState ? ` from-${fromState}` : ''}${showGlow ? ' music-glow' : ''}${showGlow === 'paused' ? ' music-paused' : ''}${springAnimation ? ' spring-animation' : ''} speed-${animationSpeed}`;
  }, [state, morphing, fromState, showGlow, springAnimation, animationSpeed, shapeMode, cornerStyle]);

  const lyricsWidth = resolveLyricsShellWidth({ state, contentWidth: lyricsContentWidth, shapeMode, cornerStyle });

  const shellStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!showGlow && lyricsWidth === null) return undefined;
    const [r, g, b] = dominantColor;
    const glowStyle = showGlow ? { '--glow-r': r, '--glow-g': g, '--glow-b': b } : {};
    const widthStyle = lyricsWidth === null ? {} : { '--lyrics-island-width': `${lyricsWidth}px` };
    return { ...glowStyle, ...widthStyle } as React.CSSProperties;
  }, [showGlow, dominantColor, lyricsWidth]);

  return {
    shellClassName,
    shellStyle,
  };
}
