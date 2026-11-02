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
 * @file weatherSettingsSection.test.ts
 * @description WeatherSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherSettingsSection } from '../WeatherSettingsSection';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof WeatherSettingsSection> {
  return {
    weatherLocationPriorityOptions: [{ value: 'ip', label: 'IP' }, { value: 'custom', label: 'Custom' }],
    weatherLocationPriority: 'ip',
    applyWeatherLocationPriority: vi.fn(() => Promise.resolve()),
    setWeatherLocationConfigMessage: vi.fn(),
    weatherCustomCityInput: '',
    setWeatherCustomCityInput: vi.fn(),
    testWeatherCustomLocation: vi.fn(() => Promise.resolve()),
    setWeatherCustomLocationTesting: vi.fn(),
    setWeatherCustomLocationTestMessage: vi.fn(),
    weatherCustomLocationTesting: false,
    saveWeatherLocationSettings: vi.fn(() => Promise.resolve()),
    weatherLocationConfigMessage: null,
    weatherCustomLocationTestMessage: null,
    cwaApiKeyInput: '',
    setCwaApiKeyInput: vi.fn(),
    cwaApiKeyMessage: null,
    saveCwaApiKeySetting: vi.fn(() => Promise.resolve()),
    clearCwaApiKeySetting: vi.fn(),
  };
}
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('WeatherSettingsSection', () => {
  it('switches location priority, edits city and reports rejected testing and saving', async () => {
    const props = makeProps();
    props.testWeatherCustomLocation = vi.fn(() => Promise.reject(new Error('offline')));
    props.saveWeatherLocationSettings = vi.fn(() => Promise.reject(new Error('save')));
    const tree = WeatherSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.options.locationPriority.custom'), 'onClick');
    expect(props.applyWeatherLocationPriority).toHaveBeenCalledWith('custom');
    invoke(findElement(tree, (n) => n.type === 'input' && elementProps(n).type === 'text'), 'onChange', { target: { value: 'Tokyo' } });
    expect(props.setWeatherCustomCityInput).toHaveBeenCalledWith('Tokyo');
    invoke(findElement(tree, (n) => textContent(n) === 'settings.weather.testCustomLocation' && n.type === 'button'), 'onClick');
    invoke(findElement(tree, (n) => textContent(n) === 'settings.weather.saveLocation' && n.type === 'button'), 'onClick');
    await Promise.resolve();
    expect(props.setWeatherCustomLocationTesting).toHaveBeenCalledWith(false);
    expect(props.setWeatherCustomLocationTestMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.weather.messages.testFailed' });
    expect(props.setWeatherLocationConfigMessage).toHaveBeenCalledWith({ type: 'error', text: 'settings.common.saveFailed' });
  });
  it('shows the CWA key and location cards together on a single page', () => {
    const tree = WeatherSettingsSection(makeProps());
    const text = textContent(tree);
    expect(text).toContain('settings.weather.cwa.title');
    expect(text).toContain('settings.weather.locationPriority.title');
    expect(text).toContain('settings.weather.customCityTitle');
    expect(text.indexOf('settings.weather.cwa.title')).toBeLessThan(text.indexOf('settings.weather.locationPriority.title'));
  });
  it('renders a masked CWA key field and wires edit, save and clear', () => {
    const props = { ...makeProps(), cwaApiKeyInput: 'CWA-SECRET' };
    const tree = WeatherSettingsSection(props);
    const input = findElement(tree, (n) => n.type === 'input');
    expect(elementProps(input).type).toBe('password');
    expect(elementProps(input).value).toBe('CWA-SECRET');
    invoke(input, 'onChange', { target: { value: 'CWA-NEW' } });
    expect(props.setCwaApiKeyInput).toHaveBeenCalledWith('CWA-NEW');
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.cwa.save'), 'onClick');
    expect(props.saveCwaApiKeySetting).toHaveBeenCalledTimes(1);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.cwa.clear'), 'onClick');
    expect(props.clearCwaApiKeySetting).toHaveBeenCalledTimes(1);
  });
  it('opens the CWA registration page and disables clear while the key is empty', () => {
    const openUrl = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('window', { api: { clipboardOpenUrl: openUrl } });
    const tree = WeatherSettingsSection({ ...makeProps() });
    expect(elementProps(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.cwa.clear')).disabled).toBe(true);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.cwa.register'), 'onClick');
    expect(openUrl).toHaveBeenCalledWith('https://opendata.cwa.gov.tw/userLogin');
  });
  it('shows the CWA key message with a matching colour', () => {
    const tree = WeatherSettingsSection({ ...makeProps(), cwaApiKeyMessage: { type: 'error', text: 'bad key' } });
    expect(elementProps(findElement(tree, (n) => n.type === 'div' && textContent(n) === 'bad key')).style).toEqual({ color: '#ff7f7f' });
  });
  it('shows testing disabled state and both error and success messages', () => {
    const tree = WeatherSettingsSection({ ...makeProps(), weatherCustomLocationTesting: true, weatherLocationConfigMessage: { type: 'error', text: 'failure' }, weatherCustomLocationTestMessage: { type: 'success', text: 'success' } });
    expect(textContent(tree)).toContain('failure');
    expect(textContent(tree)).toContain('success');
    expect(elementProps(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.weather.testing')).disabled).toBe(true);
  });
});
