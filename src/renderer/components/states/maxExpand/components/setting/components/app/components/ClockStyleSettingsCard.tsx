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
 * @file ClockStyleSettingsCard.tsx
 * @description 设置页面 - 总览时钟样式配置卡片，支持色彩模式、字体、尺寸与日期行设置及实时预览
 * @author 鸡哥
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../../../store/slices';
import {
  OVERVIEW_CLOCK_DATE_FORMAT_OPTIONS,
  OVERVIEW_CLOCK_FONT_OPTIONS,
  OVERVIEW_CLOCK_GRADIENT_PRESETS,
  OVERVIEW_CLOCK_SIZE_OPTIONS,
  OVERVIEW_CLOCK_SOLID_PRESETS,
  OVERVIEW_CLOCK_WEIGHT_OPTIONS,
} from '../../../../../../expand/pages/OverviewTab/config/overviewConfig';
import { useOverviewClockSettings } from '../../../../../../expand/pages/OverviewTab/hooks/useOverviewClockSettings';
import type { OverviewClockColorMode } from '../../../../../../expand/pages/OverviewTab/types/overviewTypes';
import {
  buildPreviewClockStyle,
  formatOverviewDate,
  formatOverviewTime,
} from '../../../../../../expand/pages/OverviewTab/utils/overviewClockUtils';
import { isHexColor } from '../../../../../../expand/pages/OverviewTab/utils/overviewTabUtils';

/**
 * 渲染总览中间大时钟的样式设置卡片
 * @description 提供实时预览、4 种色彩模式（自动渐变、纯色、双色渐变、跟随专辑）、
 * 7 种 Windows 原生字体、4 档字重与字号、秒数开关、12h/24h 切换以及日期行格式设置。
 * @returns 时钟样式设置卡片组件
 */
export function ClockStyleSettingsCard(): ReactElement {
  const { t } = useTranslation();
  const [config, updateConfig] = useOverviewClockSettings();
  const { dominantColor } = useIslandStore(useShallow((store) => ({ dominantColor: store.dominantColor })));
  const [now, setNow] = useState(() => new Date());

  const [solidDraft, setSolidDraft] = useState(config.solidColor);
  const [gradStartDraft, setGradStartDraft] = useState(config.gradientStart);
  const [gradEndDraft, setGradEndDraft] = useState(config.gradientEnd);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSolidDraft(config.solidColor);
  }, [config.solidColor]);

  useEffect(() => {
    setGradStartDraft(config.gradientStart);
  }, [config.gradientStart]);

  useEffect(() => {
    setGradEndDraft(config.gradientEnd);
  }, [config.gradientEnd]);

  const previewDateText = formatOverviewDate(now, config.dateFormat, t);
  const previewTimeText = formatOverviewTime(now, config.is24Hour, config.showSeconds);
  const { clockStyle } = buildPreviewClockStyle(config, dominantColor);

  const colorModes: { value: OverviewClockColorMode; labelKey: string }[] = [
    { value: 'auto', labelKey: 'settings.app.layout.clock.colorModes.auto' },
    { value: 'solid', labelKey: 'settings.app.layout.clock.colorModes.solid' },
    { value: 'gradient', labelKey: 'settings.app.layout.clock.colorModes.gradient' },
    { value: 'album', labelKey: 'settings.app.layout.clock.colorModes.album' },
  ];

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">{t('settings.app.layout.clock.title', { defaultValue: '时钟样式' })}</div>
        <div className="settings-card-subtitle">
          {t('settings.app.layout.clock.subtitle', { defaultValue: '自定义总览面板中间大时钟的颜色、字体、尺寸与日期显示，实时同步生效。' })}
        </div>
      </div>

      {/* 实时预览盒 */}
      <div className="settings-clock-preview-box">
        {config.showDate && <div className="settings-clock-preview-date">{previewDateText}</div>}
        <div className="settings-clock-preview-digits" style={clockStyle}>
          {previewTimeText}
        </div>
      </div>

      <div className="settings-layout-controls">
        {/* 色彩模式 */}
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.colorMode', { defaultValue: '色彩模式' })}
          </span>
          <div className="settings-layout-options">
            {colorModes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-layout-btn ${config.colorMode === opt.value ? 'active' : ''}`}
                onClick={() => updateConfig({ colorMode: opt.value })}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* 纯色设置 */}
          {config.colorMode === 'solid' && (
            <div className="settings-layout-gradient-editor">
              <span className="settings-layout-control-label settings-layout-gradient-title">
                {t('settings.app.layout.clock.presetSwatches', { defaultValue: '预设色板' })}
              </span>
              <div className="settings-agent-quota-colors">
                {OVERVIEW_CLOCK_SOLID_PRESETS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`settings-agent-quota-swatch ${config.solidColor === swatch ? 'active' : ''}`}
                    style={{ background: swatch }}
                    title={swatch}
                    aria-label={swatch}
                    onClick={() => {
                      setSolidDraft(swatch);
                      updateConfig({ solidColor: swatch });
                    }}
                  />
                ))}
                <input
                  type="text"
                  className="settings-agent-quota-hex"
                  value={solidDraft}
                  maxLength={7}
                  placeholder="#RRGGBB"
                  aria-label={t('settings.app.layout.clock.customHex', { defaultValue: '自定义色值' })}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSolidDraft(val);
                    if (isHexColor(val)) updateConfig({ solidColor: val });
                  }}
                />
              </div>
              {!isHexColor(solidDraft) && (
                <span className="settings-agent-quota-error">
                  {t('settings.app.layout.clock.invalidHex', { defaultValue: '请输入 #RRGGBB 格式的颜色' })}
                </span>
              )}
            </div>
          )}

          {/* 双色渐变设置 */}
          {config.colorMode === 'gradient' && (
            <div className="settings-layout-gradient-editor">
              <span className="settings-layout-control-label settings-layout-gradient-title">
                {t('settings.app.layout.clock.gradientPresets', { defaultValue: '预设双色渐变' })}
              </span>
              <div className="settings-clock-gradient-presets">
                {OVERVIEW_CLOCK_GRADIENT_PRESETS.map((preset) => {
                  const isActive = config.gradientStart === preset.start && config.gradientEnd === preset.end;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`settings-clock-gradient-swatch ${isActive ? 'active' : ''}`}
                      style={{ background: `linear-gradient(90deg, ${preset.start}, ${preset.end})` }}
                      title={`${preset.start} → ${preset.end}`}
                      aria-label={`${preset.start} → ${preset.end}`}
                      onClick={() => {
                        setGradStartDraft(preset.start);
                        setGradEndDraft(preset.end);
                        updateConfig({ gradientStart: preset.start, gradientEnd: preset.end });
                      }}
                    />
                  );
                })}
              </div>
              <div className="settings-clock-hex-row">
                <div className="settings-clock-hex-field">
                  <span className="settings-clock-hex-label">{t('settings.app.layout.clock.gradientStart', { defaultValue: '起始色' })}</span>
                  <input
                    type="text"
                    className="settings-agent-quota-hex"
                    value={gradStartDraft}
                    maxLength={7}
                    placeholder="#RRGGBB"
                    aria-label={t('settings.app.layout.clock.gradientStart', { defaultValue: '起始色' })}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGradStartDraft(val);
                      if (isHexColor(val)) updateConfig({ gradientStart: val });
                    }}
                  />
                </div>
                <div className="settings-clock-hex-field">
                  <span className="settings-clock-hex-label">{t('settings.app.layout.clock.gradientEnd', { defaultValue: '结束色' })}</span>
                  <input
                    type="text"
                    className="settings-agent-quota-hex"
                    value={gradEndDraft}
                    maxLength={7}
                    placeholder="#RRGGBB"
                    aria-label={t('settings.app.layout.clock.gradientEnd', { defaultValue: '结束色' })}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGradEndDraft(val);
                      if (isHexColor(val)) updateConfig({ gradientEnd: val });
                    }}
                  />
                </div>
              </div>
              {(!isHexColor(gradStartDraft) || !isHexColor(gradEndDraft)) && (
                <span className="settings-agent-quota-error">
                  {t('settings.app.layout.clock.invalidHex', { defaultValue: '请输入 #RRGGBB 格式的颜色' })}
                </span>
              )}
            </div>
          )}

          {/* 跟随专辑主色提示 */}
          {config.colorMode === 'album' && (
            <div className="settings-clock-info-note">
              {t('settings.app.layout.clock.albumHint', { defaultValue: '跟随当前播放歌曲的专辑封面主色，无播放时回退为自动渐变。' })}
            </div>
          )}

          {/* 自动渐变提示 */}
          {config.colorMode === 'auto' && (
            <div className="settings-clock-info-note">
              {t('settings.app.layout.clock.autoHint', { defaultValue: '使用灵动岛默认的艺术渐变光泽。' })}
            </div>
          )}
        </div>

        {/* 字体选择 */}
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.fontFamily', { defaultValue: '字体' })}
          </span>
          <div className="settings-layout-options">
            {OVERVIEW_CLOCK_FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-layout-btn ${config.fontFamily === opt.value ? 'active' : ''}`}
                onClick={() => updateConfig({ fontFamily: opt.value })}
              >
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </button>
            ))}
          </div>
        </div>

        {/* 字重与尺寸 */}
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.fontWeight', { defaultValue: '字重' })}
          </span>
          <div className="settings-layout-options">
            {OVERVIEW_CLOCK_WEIGHT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-layout-btn ${config.fontWeight === opt.value ? 'active' : ''}`}
                onClick={() => updateConfig({ fontWeight: opt.value })}
              >
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.fontSize', { defaultValue: '尺寸' })}
          </span>
          <div className="settings-layout-options">
            {OVERVIEW_CLOCK_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-layout-btn ${config.fontSize === opt.value ? 'active' : ''}`}
                onClick={() => updateConfig({ fontSize: opt.value })}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* 时间制式与秒数显示 */}
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.timeFormat', { defaultValue: '时间格式' })}
          </span>
          <div className="settings-layout-options">
            <button
              type="button"
              className={`settings-layout-btn ${config.is24Hour ? 'active' : ''}`}
              onClick={() => updateConfig({ is24Hour: true })}
            >
              {t('settings.app.layout.clock.format24', { defaultValue: '24小时制' })}
            </button>
            <button
              type="button"
              className={`settings-layout-btn ${!config.is24Hour ? 'active' : ''}`}
              onClick={() => updateConfig({ is24Hour: false })}
            >
              {t('settings.app.layout.clock.format12', { defaultValue: '12小时制' })}
            </button>
          </div>
          <div className="settings-card-inline-row" style={{ marginTop: '6px' }}>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={config.showSeconds}
                onChange={(e) => updateConfig({ showSeconds: e.target.checked })}
              />
              {t('settings.app.layout.clock.showSeconds', { defaultValue: '显示秒数' })}
            </label>
          </div>
        </div>

        {/* 日期行设置 */}
        <div className="settings-layout-control">
          <span className="settings-layout-control-label">
            {t('settings.app.layout.clock.dateLine', { defaultValue: '日期行' })}
          </span>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={config.showDate}
                onChange={(e) => updateConfig({ showDate: e.target.checked })}
              />
              {t('settings.app.layout.clock.showDate', { defaultValue: '显示日期' })}
            </label>
          </div>
          {config.showDate && (
            <div className="settings-layout-options" style={{ marginTop: '6px' }}>
              {OVERVIEW_CLOCK_DATE_FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`settings-layout-btn ${config.dateFormat === opt.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ dateFormat: opt.value })}
                >
                  {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
