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
 * @file weatherTab.test.tsx
 * @description WeatherTab 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, invoke, text } from '../../../../../test/tree';

import { WeatherTab } from '../WeatherTab';
import type { TreeElement } from '../../../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { weather: { description: 'Clear', temperature: 25, humidity: 64, windSpeed: 3.2, precipitationProbability: 30 as number | undefined, iconCode: 1, forecast: [] as Array<{ description: string; iconCode: number; temperatureMin: number; temperatureMax: number; precipitationProbability: number; windSpeed: number }> }, weatherStatus: 'ok' as string, location: null as null | { city: string; latitude: number; longitude: number }, fetchWeatherData: vi.fn().mockResolvedValue('ok'), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn() } }));
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
beforeEach(() => { model.store.location = null; model.store.weather.forecast = []; model.store.weatherStatus = 'ok'; model.store.weather.precipitationProbability = 30; model.store.setMaxExpand.mockClear(); model.store.setMaxExpandTab.mockClear(); });
describe('WeatherTab', () => {
  it('renders current weather with missing location fallback', () => { expect(text(((WeatherTab() as TreeElement)))).toContain('25°'); expect(text(((WeatherTab() as TreeElement)))).toContain('hover.weather.unknownCity'); });
  it('renders the city name and forecast average temperature', () => { model.store.location = { city: 'Beijing', latitude: 39.9, longitude: 116.4 }; model.store.weather.forecast = [{ description: 'Clear', iconCode: 1, temperatureMin: 10, temperatureMax: 20, precipitationProbability: 0, windSpeed: 2 }]; const root = ((WeatherTab() as TreeElement)); expect(text(root)).toContain('Beijing'); expect(text(root)).toContain('15℃'); });
  it('shows the three metric cards for humidity, rain probability and wind', () => { const content = text(((WeatherTab() as TreeElement))); expect(content).toContain('64%'); expect(content).toContain('30%'); expect(content).toContain('3.2m/s'); expect(content).toContain('hover.weather.metrics.humidity'); expect(content).toContain('hover.weather.metrics.rain'); expect(content).toContain('hover.weather.metrics.wind'); });
  it('falls back to N/A when the rain probability is missing from an older cache', () => { model.store.weather.precipitationProbability = undefined; expect(text(((WeatherTab() as TreeElement)))).toContain('hover.weather.na'); });
  it.each([['no-key', 'noKey'], ['invalid-key', 'invalidKey'], ['out-of-region', 'outOfRegion']])('renders the empty state for status %s instead of stale weather', (status, key) => { model.store.weatherStatus = status; const root = ((WeatherTab() as TreeElement)); const content = text(root); expect(content).toContain('hover.weather.empty.' + key + '.title'); expect(content).not.toContain('25°'); expect(content).not.toContain('hover.weather.metrics.humidity'); });
  it('opens the weather settings from the no-key empty state', async () => { model.store.weatherStatus = 'no-key'; const storeWrite = vi.fn().mockResolvedValue(true); vi.stubGlobal('window', { api: { storeWrite } }); const root = ((WeatherTab() as TreeElement)); invoke(byClass(root, 'weather-tab-empty-btn'), 'onClick'); expect(storeWrite).toHaveBeenCalledWith('settings-open-tab', 'weather'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('settings'); expect(model.store.setMaxExpand).toHaveBeenCalledOnce(); });
  it('does not offer the settings shortcut when the location is outside Taiwan', () => { model.store.weatherStatus = 'out-of-region'; expect(() => byClass(((WeatherTab() as TreeElement)), 'weather-tab-empty-btn')).toThrow(); });
  it('refreshes once while busy and clears the spinner after completion', async () => { let resolve!: () => void; model.store.fetchWeatherData.mockReturnValue(new Promise<void>((done) => { resolve = done; })); const root = ((WeatherTab() as TreeElement)); const pending = invoke(byClass(root, 'weather-tab-icon'), 'onClick'); slots.cursor = 0; const busy = ((WeatherTab() as TreeElement)); expect(byClass(busy, 'weather-tab-icon').props.className).toContain('spinning'); await invoke(byClass(busy, 'weather-tab-icon'), 'onClick'); expect(model.store.fetchWeatherData).toHaveBeenCalledExactlyOnceWith(undefined, true); resolve(); await pending; expect(slots.values[0]).toBe(false); });
  it('replaces broken icons and prevents fallback recursion', () => { const target = { onerror: vi.fn() as unknown, src: '' }; invoke(byClass(((WeatherTab() as TreeElement)), 'weather-tab-icon'), 'onError', { currentTarget: target }); expect(target.onerror).toBeNull(); expect(target.src).not.toBe(''); });
});
