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
 * @file expandedNavDots.test.tsx
 * @description 展开面板导航点的上一页/下一页箭头：顺序跳转与首尾禁用。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { nodes, render } from '../../../maxExpand/test/componentHarness';
import { ExpandedNavDots } from '../ExpandedNavDots';

const DOTS = ['hover', 'overview', 'song'] as never[];

/**
 * 渲染导航点并返回箭头按钮。
 * @param tab - 当前页
 * @param onNavDotClick - 点击回调
 * @returns 上一页、下一页按钮元素
 */
function arrows(tab: string, onNavDotClick = vi.fn()): { prev: Record<string, unknown>; next: Record<string, unknown> } {
  const tree = render(ExpandedNavDots, { navDots: DOTS, expandTab: tab, onNavDotClick });
  const [prev, next] = nodes(tree, '.expand-nav-arrow').map((n) => n.props);
  return { prev, next };
}

describe('ExpandedNavDots arrows', () => {
  it('中间页按顺序跳转到上一页和下一页', () => {
    const onNavDotClick = vi.fn();
    const { prev, next } = arrows('overview', onNavDotClick);
    (next.onClick as () => void)();
    (prev.onClick as () => void)();
    expect(onNavDotClick).toHaveBeenNthCalledWith(1, 'song');
    expect(onNavDotClick).toHaveBeenNthCalledWith(2, 'hover');
  });

  it('首尾页禁用对应箭头，未知页两侧都禁用', () => {
    expect(arrows('hover').prev.disabled).toBe(true);
    expect(arrows('song').next.disabled).toBe(true);
    const unknown = arrows('tools');
    expect([unknown.prev.disabled, unknown.next.disabled]).toEqual([true, true]);
  });
});
