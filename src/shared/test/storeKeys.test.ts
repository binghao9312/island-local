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
 * @description 共享持久化键的运行时契约测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { ISLAND_POSITION_LOCKED_STORE_KEY } from '../storeKeys';
describe('shared store keys', () => {
  it('keeps persistence keys stable', () => {
    expect(ISLAND_POSITION_LOCKED_STORE_KEY).toBe('island-position-locked');
  });
});
