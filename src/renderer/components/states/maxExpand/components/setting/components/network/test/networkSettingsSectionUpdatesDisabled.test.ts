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
 * @file networkSettingsSectionUpdatesDisabled.test.ts
 * @description 更新检测关闭时，网络配置的数据中心页不再提供更新源选择卡片的测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkSettingsSection } from '../NetworkSettingsSection';
import { elements, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => { resetState(); });

/**
 * 构造数据中心页的完整属性。
 * @returns 带有更新源选项的组件属性。
 */
function makeProps(): ComponentProps<typeof NetworkSettingsSection> {
  return {
    isProUser: true,
    networkTimeoutMs: 5000,
    customTimeoutInput: '5',
    staticAssetNode: 'r2',
    networkTimeoutOptions: [{ label: 'Five', value: 5000 }],
    staticAssetNodeOptions: [{ label: 'R2', value: 'r2' }, { label: 'COS', value: 'cos', proOnly: true }],
    setNetworkTimeoutMs: vi.fn(),
    setCustomTimeoutInput: vi.fn(),
    setStaticAssetNode: vi.fn(),
    saveNetworkConfig: vi.fn(),
    currentNetworkSettingsPageLabel: '',
    networkSettingsPage: 'data-center',
    networkSettingsPages: [],
    networkSettingsPageLabels: { timeout: 'Timeout', 'data-center': 'Nodes' },
    setNetworkSettingsPage: vi.fn(),
    updateSource: 'github',
    updateSources: [{ key: 'github', label: 'GitHub' }],
    onUpdateSourceChange: vi.fn(),
  };
}

describe('NetworkSettingsSection with UPDATES_ENABLED=false', () => {
  it('hides the update source card but keeps the static asset node choices', () => {
    const tree = NetworkSettingsSection(makeProps());
    const all = elements(tree);
    expect(all.some((n) => n.type === 'input' && n.props.name === 'update-source')).toBe(false);
    expect(all.some((n) => n.type === 'div' && textContent(n) === 'settings.network.updateSource.title')).toBe(false);
    expect(all.some((n) => n.type === 'button' && textContent(n) === 'COS')).toBe(true);
  });
});
