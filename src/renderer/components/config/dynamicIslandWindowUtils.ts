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
 * @file dynamicIslandWindowUtils.ts
 * @description 灵动岛窗口相关工具函数。
 * @author 鸡哥
 */

/**
 * @description 判断鼠标是否位于当前窗口范围内。
 * @returns 鼠标在窗口内返回 true，否则返回 false。
 */
export async function isMouseInWindow(): Promise<boolean> {
  try {
    const mouseWindowState = await window.api?.getMouseWindowState?.();
    if (mouseWindowState) {
      const { mousePosition, bounds } = mouseWindowState;
      return (
        mousePosition.x >= bounds.x
        && mousePosition.x <= bounds.x + bounds.width
        && mousePosition.y >= bounds.y
        && mousePosition.y <= bounds.y + bounds.height
      );
    }

    const mousePos = await window.api?.getMousePosition();
    const bounds = await window.api?.getWindowBounds();

    if (!mousePos || !bounds) return false;

    return (
      mousePos.x >= bounds.x
      && mousePos.x <= bounds.x + bounds.width
      && mousePos.y >= bounds.y
      && mousePos.y <= bounds.y + bounds.height
    );
  } catch {
    return false;
  }
}

/**
 * 判断屏幕坐标是否落在壳层矩形内，用于收缩后的歌词壳层命中测试。
 * @description 窗口 DIP 尺寸与视口 CSS 宽度之比即缩放系数，据此把屏幕点换算到视口 CSS 坐标系。
 * @param input - 命中判断参数。
 * @param input.mousePosition - 鼠标屏幕坐标（DIP）。
 * @param input.windowBounds - 原生窗口屏幕范围（DIP）。
 * @param input.viewportWidth - 视口 CSS 宽度，无效值（非正数）时视为未命中。
 * @param input.shellRect - 壳层在视口内的 CSS 矩形。
 * @returns 落在壳层内返回 true，否则返回 false。
 */
export function isPointInShellRect(input: {
  mousePosition: { x: number; y: number };
  windowBounds: { x: number; y: number; width: number };
  viewportWidth: number;
  shellRect: { left: number; top: number; width: number; height: number };
}): boolean {
  const { mousePosition, windowBounds, viewportWidth, shellRect } = input;
  if (viewportWidth <= 0 || windowBounds.width <= 0) return false;
  const scale = windowBounds.width / viewportWidth;
  const x = (mousePosition.x - windowBounds.x) / scale;
  const y = (mousePosition.y - windowBounds.y) / scale;
  return x >= shellRect.left
    && x <= shellRect.left + shellRect.width
    && y >= shellRect.top
    && y <= shellRect.top + shellRect.height;
}

/**
 * 判断鼠标是否位于可见灵动岛壳层内。
 * @description 歌词状态的原生窗口固定为 500px，壳层收缩后窗口外的透明区域应穿透，因此命中以壳层矩形为准；找不到壳层或无法获取鼠标状态时回退为窗口范围判断。
 * @returns 鼠标在壳层内返回 true，否则返回 false。
 */
export async function isMouseInIslandShell(): Promise<boolean> {
  try {
    const shell = document.querySelector<HTMLElement>('.island-shell');
    if (!shell) return await isMouseInWindow();
    const mouseWindowState = await window.api?.getMouseWindowState?.();
    if (!mouseWindowState) return await isMouseInWindow();
    return isPointInShellRect({
      mousePosition: mouseWindowState.mousePosition,
      windowBounds: mouseWindowState.bounds,
      viewportWidth: document.documentElement.clientWidth,
      shellRect: shell.getBoundingClientRect(),
    });
  } catch {
    return false;
  }
}
