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
 * @file storeKeys.test.ts
 * @description 共享持久化键和截图引擎合法集合的运行时及类型契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { ISLAND_POSITION_LOCKED_STORE_KEY, SCREENSHOT_ENGINE_STORE_KEY } from '../storeKeys';
import type { ScreenshotEngine } from '../storeKeys';
describe('shared store keys', () => {
  it('keeps persistence keys stable and unique', () => {
    expect([ISLAND_POSITION_LOCKED_STORE_KEY, SCREENSHOT_ENGINE_STORE_KEY]).toEqual(['island-position-locked', 'screenshot-engine']);
    expect(new Set([ISLAND_POSITION_LOCKED_STORE_KEY, SCREENSHOT_ENGINE_STORE_KEY]).size).toBe(2);
  });
  it('accepts only the declared screenshot engines', () => {
    expectTypeOf<ScreenshotEngine>().toEqualTypeOf<'plugin' | 'js'>();
    const screenshot: ScreenshotEngine[] = ['plugin', 'js'];
    expect(screenshot).toHaveLength(2);
    // @ts-expect-error 截图引擎不接受未经声明的名称。
    const invalidScreenshot: ScreenshotEngine = 'native';
    expect(invalidScreenshot).toBe('native');
  });
});
