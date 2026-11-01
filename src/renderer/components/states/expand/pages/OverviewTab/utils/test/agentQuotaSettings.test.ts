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
 * @file agentQuotaSettings.test.ts
 * @description Agent 额度卡片设置的标准化：合法值保留、非法字段回退默认值、颜色格式校验。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_QUOTA_SETTINGS } from '../../config/overviewConfig';
import { isHexColor, normalizeAgentQuotaSettings } from '../overviewTabUtils';

describe('normalizeAgentQuotaSettings', () => {
  it('保留合法的字号、样式与颜色', () => {
    expect(normalizeAgentQuotaSettings({
      fontSize: 'large',
      style: 'compact',
      colors: { claude: '#7be4ff', codex: '#A6E3A1' },
    })).toEqual({
      fontSize: 'large',
      style: 'compact',
      colors: { claude: '#7be4ff', codex: '#A6E3A1' },
    });
  });

  it('非法字段逐项回退默认值，互不影响', () => {
    expect(normalizeAgentQuotaSettings({
      fontSize: 'huge',
      style: 'bars',
      colors: { claude: 'red', codex: '#8da8ff' },
    })).toEqual({
      fontSize: DEFAULT_AGENT_QUOTA_SETTINGS.fontSize,
      style: 'bars',
      colors: { claude: DEFAULT_AGENT_QUOTA_SETTINGS.colors.claude, codex: '#8da8ff' },
    });
  });

  it('空值、非对象或缺失颜色时返回完整默认设置', () => {
    expect(normalizeAgentQuotaSettings(undefined)).toEqual(DEFAULT_AGENT_QUOTA_SETTINGS);
    expect(normalizeAgentQuotaSettings('bars')).toEqual(DEFAULT_AGENT_QUOTA_SETTINGS);
    expect(normalizeAgentQuotaSettings({ fontSize: 'small' })).toEqual({ ...DEFAULT_AGENT_QUOTA_SETTINGS, fontSize: 'small' });
  });
});

describe('isHexColor', () => {
  it('只接受六位十六进制颜色', () => {
    expect(isHexColor('#00ff7f')).toBe(true);
    expect(isHexColor('#0f7')).toBe(false);
    expect(isHexColor('00ff7f')).toBe(false);
    expect(isHexColor('#00ff7g')).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});
