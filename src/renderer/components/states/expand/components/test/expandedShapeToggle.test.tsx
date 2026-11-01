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
 * @file expandedShapeToggle.test.tsx
 * @description 展开面板形态快速切换：目标形态与主进程调用。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { nodes, render } from '../../../maxExpand/test/componentHarness';
import { ExpandedShapeToggle } from '../ExpandedShapeToggle';

const mocks = vi.hoisted(() => ({ shapeMode: 'notch' }));
vi.mock('../../../../../store/slices', () => ({ default: (selector: (state: object) => unknown) => selector({ shapeMode: mocks.shapeMode }) }));

afterEach(() => { vi.unstubAllGlobals(); });

describe('ExpandedShapeToggle', () => {
  it.each([['notch', 'pill', 'expanded.shapeToggle.toPill'], ['pill', 'notch', 'expanded.shapeToggle.toNotch']])('%s 模式下切换到 %s', (current, target, labelKey) => {
    mocks.shapeMode = current;
    const shapeModeSet = vi.fn(() => Promise.resolve());
    vi.stubGlobal('window', { api: { shapeModeSet } });
    const button = nodes(render(ExpandedShapeToggle), 'button')[0];
    expect(String(button.props['aria-label'])).toContain(labelKey);
    (button.props.onClick as (e: { stopPropagation: () => void }) => void)({ stopPropagation: vi.fn() });
    expect(shapeModeSet).toHaveBeenCalledWith(target);
  });
});
