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
 * @file toolboxBoundaries.test.ts
 * @description 工具箱软件与文本翻译请求的无响应、无效 JSON、失败码和生产域名测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.fn();
beforeEach(() => {
  vi.resetModules();
  net.mockReset();
  vi.stubGlobal('window', { location: { hostname: 'app.local' }, api: { netFetch: net } });
});
afterEach(() => vi.unstubAllGlobals());

describe('toolbox response boundaries', () => {
  it.each([{ response: undefined }, { response: { ok: false } }, { response: { ok: true, body: 'invalid json' } }, { response: { ok: true, body: 'null' } }, { response: { ok: true, body: '{"code":500,"data":[]}' } }, { response: { ok: true, body: '{"code":200,"data":{}}' } }])('returns no software list for $response', async ({ response }) => {
    net.mockResolvedValueOnce(response);
    const { fetchToolboxSoftwareList } = await import('../toolboxSoftwareApi');
    expect(await fetchToolboxSoftwareList()).toEqual([]);
    expect(net).toHaveBeenCalledExactlyOnceWith('https://server.pyisland.com/api/v1/toolbox/software/list', { method: 'GET', timeoutMs: 8000 });
  });
  it('contains software transport rejection', async () => {
    net.mockRejectedValueOnce(new Error('offline'));
    const { fetchToolboxSoftwareList } = await import('../toolboxSoftwareApi');
    expect(await fetchToolboxSoftwareList()).toEqual([]);
  });
});
