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
 * @file versionApiDisabled.test.ts
 * @description 更新总开关关闭时，版本接口不发起任何网络请求的测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const netFetch = vi.fn();

beforeEach(() => {
  vi.resetModules();
  netFetch.mockReset();
  vi.stubGlobal('window', { location: { hostname: 'example.com' }, api: { netFetch } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('versionApi with UPDATES_ENABLED=false', () => {
  it('skips the version lookup and download-count report without calling netFetch', async () => {
    const { fetchVersion, reportUpdateDownloadCount } = await import('../versionApi');

    await expect(fetchVersion()).resolves.toBeNull();
    await expect(reportUpdateDownloadCount('1.2.3')).resolves.toBe(false);
    expect(netFetch).not.toHaveBeenCalled();
  });
});
