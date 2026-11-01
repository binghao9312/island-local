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
 * @file AgentQuotaSettingsCard.tsx
 * @description 设置页 - 总览 Agent 额度卡片的字号、显示样式与来源强调色配置，修改后立即保存
 * @author 鸡哥
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_QUOTA_COLOR_PRESETS } from '../../../../../../expand/pages/OverviewTab/config/overviewConfig';
import { useAgentQuotaSettings } from '../../../../../../expand/pages/OverviewTab/hooks/useAgentQuotaSettings';
import { isHexColor } from '../../../../../../expand/pages/OverviewTab/utils/overviewTabUtils';
import type { AgentQuotaFontSize, AgentQuotaSettings, AgentQuotaStyle } from '../../../../../../expand/pages/OverviewTab/types/overviewTypes';

const PROVIDERS: (keyof AgentQuotaSettings['colors'])[] = ['claude', 'codex'];

/**
 * 渲染单个来源的强调色选择：预设色块与自定义 #rrggbb 输入。
 * @description 输入未完整时只在本地保留草稿并提示格式，合法值才写入设置。
 * @param props - 组件参数
 * @param props.label - 来源名称
 * @param props.color - 当前强调色
 * @param props.onChange - 颜色合法时的回调
 * @returns 颜色选择控件
 */
function AgentColorControl({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }): ReactElement {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(color);

  useEffect(() => {
    setDraft(color);
  }, [color]);

  return (
    <div className="settings-layout-control">
      <span className="settings-layout-control-label">{label}</span>
      <div className="settings-agent-quota-colors">
        {AGENT_QUOTA_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            className={`settings-agent-quota-swatch ${color === preset ? 'active' : ''}`}
            type="button"
            title={preset}
            aria-label={preset}
            style={{ background: preset }}
            onClick={() => onChange(preset)}
          />
        ))}
        <input
          className="settings-agent-quota-hex"
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          placeholder="#RRGGBB"
          aria-label={t('settings.app.layout.agentQuota.customHex', { defaultValue: '自定义色值' })}
          onChange={(e) => {
            setDraft(e.target.value);
            if (isHexColor(e.target.value)) onChange(e.target.value);
          }}
        />
      </div>
      {!isHexColor(draft) && (
        <span className="settings-agent-quota-error">
          {t('settings.app.layout.agentQuota.invalidHex', { defaultValue: '请输入 #RRGGBB 格式的颜色' })}
        </span>
      )}
    </div>
  );
}

/**
 * 渲染总览 Agent 额度卡片设置卡片。
 * @returns 设置卡片
 */
export function AgentQuotaSettingsCard(): ReactElement {
  const { t } = useTranslation();
  const [settings, saveSettings] = useAgentQuotaSettings();

  const fontSizes: { value: AgentQuotaFontSize; label: string }[] = [
    { value: 'small', label: t('settings.app.layout.agentQuota.fontSmall', { defaultValue: '小' }) },
    { value: 'medium', label: t('settings.app.layout.agentQuota.fontMedium', { defaultValue: '中' }) },
    { value: 'large', label: t('settings.app.layout.agentQuota.fontLarge', { defaultValue: '大' }) },
  ];
  const styles: { value: AgentQuotaStyle; label: string }[] = [
    { value: 'bars', label: t('settings.app.layout.agentQuota.styleBars', { defaultValue: '进度条' }) },
    { value: 'compact', label: t('settings.app.layout.agentQuota.styleCompact', { defaultValue: '紧凑文字' }) },
  ];

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">{t('settings.app.layout.agentQuota.title', { defaultValue: 'Agent 额度卡片' })}</div>
        <div className="settings-card-subtitle">{t('settings.app.layout.agentQuota.hint', { defaultValue: '调整总览中 Agent 额度卡片的字号、显示样式与来源强调色，修改后立即生效。' })}</div>
      </div>
      <div className="settings-layout-controls">
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">{t('settings.app.layout.agentQuota.fontSize', { defaultValue: '字号' })}</span>
          <div className="settings-layout-options">
            {fontSizes.map((opt) => (
              <button
                key={opt.value}
                className={`settings-layout-btn ${settings.fontSize === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => saveSettings({ ...settings, fontSize: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">{t('settings.app.layout.agentQuota.style', { defaultValue: '显示样式' })}</span>
          <div className="settings-layout-options">
            {styles.map((opt) => (
              <button
                key={opt.value}
                className={`settings-layout-btn ${settings.style === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => saveSettings({ ...settings, style: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {PROVIDERS.map((provider) => (
          <AgentColorControl
            key={provider}
            label={t(`expanded.agentUsage.providers.${provider}`)}
            color={settings.colors[provider]}
            onChange={(value) => saveSettings({ ...settings, colors: { ...settings.colors, [provider]: value } })}
          />
        ))}
      </div>
    </div>
  );
}
