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
 * @file islandSliceDisabled.test.ts
 * @description 云端与账户总开关关闭时，登录注册等云端状态不可到达且安全回退测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  const memory = new Map<string, string>();
  const storageMock = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, String(value)); },
    removeItem: (key: string) => { memory.delete(key); },
    clear: () => { memory.clear(); },
  };
  vi.stubGlobal('localStorage', storageMock);
  vi.stubGlobal('window', {
    api: {
      expandWindowSettings: vi.fn(),
      collapseWindow: vi.fn(),
      disableMousePassthrough: vi.fn(),
      enableMousePassthrough: vi.fn(),
      onSettingsChanged: vi.fn(),
    },
    location: { pathname: '/index.html' },
    matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    localStorage: storageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});

import { createStore } from 'zustand/vanilla';
import { createIslandSlice } from '../islandSlice';
import { DynamicIslandStateContent } from '../../../components/components/DynamicIslandStateContent';
import type { IslandSlice, NotificationData, WeatherData } from '../../types';

const mockForecastItem = {
  temperature: 20,
  description: 'Clear',
  temperatureMax: 25,
  temperatureMin: 15,
  windSpeed: 1,
  uvIndex: 1,
  precipitationProbability: 0,
  iconCode: 0,
};

const mockWeather: WeatherData = {
  temperature: 20,
  description: 'Clear',
  humidity: 50,
  windSpeed: 1,
  uvIndex: 1,
  iconCode: 0,
  forecast: [mockForecastItem, mockForecastItem],
};

const mockNotification: NotificationData = {
  title: 'Title',
  body: 'Body',
  type: 'default',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('islandSlice with SERVER_FEATURES_ENABLED=false', () => {
  it('does not transition to hidden cloud/account states', () => {
    const store = createStore<IslandSlice>((set, get, api) => createIslandSlice(set, get, api));
    expect(store.getState().state).toBe('idle');

    store.getState().setLogin();
    expect(store.getState().state).toBe('idle');

    store.getState().setRegister();
    expect(store.getState().state).toBe('idle');

    store.getState().setPayment({ type: 'pro' });
    expect(store.getState().state).toBe('idle');

    store.getState().setQuestionnaire();
    expect(store.getState().state).toBe('idle');

    store.getState().setSetPassword({ tempToken: '', suggestedUsername: '', email: '' });
    expect(store.getState().state).toBe('idle');

    store.getState().setBindOAuth({ tempToken: '', username: '', email: '' });
    expect(store.getState().state).toBe('idle');

    store.getState().setBindEmail({ tempToken: '', suggestedUsername: '' });
    expect(store.getState().state).toBe('idle');
  });

  it('DynamicIslandStateContent returns null for hidden cloud/account states', () => {
    const commonProps = {
      weather: mockWeather,
      timerState: 'idle' as const,
      remainingSeconds: 0,
      pomodoroRunning: false,
      pomodoroRemaining: 0,
      notification: mockNotification,
    };

    expect(DynamicIslandStateContent({ ...commonProps, state: 'login' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'register' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'resetPassword' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'setPassword' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'bindOAuth' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'bindEmail' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'payment' })).toBeNull();
    expect(DynamicIslandStateContent({ ...commonProps, state: 'questionnaire' })).toBeNull();
  });
});
