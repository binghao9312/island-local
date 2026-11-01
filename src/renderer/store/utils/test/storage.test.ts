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
 * @file storage.test.ts
 * @description storage.ts 单元测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeStoredStaticAssetNode,
  normalizeStaticAssetNode,
  loadNetworkConfig,
  saveNetworkConfig,
  loadCwaApiKey,
  saveCwaApiKey,
  hydrateCwaApiKeyFromStore,
  loadLocationFromStorage,
  saveLocationToStorage,
  loadWeatherLocationConfig,
  saveWeatherLocationConfig,
  hydrateWeatherLocationConfigFromStore,
  DEFAULT_NETWORK_TIMEOUT_MS,
  DEFAULT_STATIC_ASSET_NODE_FREE,
  loadSongProgressRingEnabled,
  saveSongProgressRingEnabled,
} from '../storage';

/* ---------- localStorage mock ---------- */

let store: Record<string, string>;

function mockLocalStorage(): void {
  store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    },
    writable: true,
    configurable: true,
  });
}

/* ---------- window.api mock ---------- */

function mockWindowApi(): void {
  Object.defineProperty(window, 'api', {
    value: {
      storeWrite: vi.fn().mockResolvedValue(undefined),
      storeRead: vi.fn().mockResolvedValue(null),
    },
    writable: true,
    configurable: true,
  });
}

/* ---------- tests ---------- */

describe('custom weather location metadata', () => {
  beforeEach(() => { vi.stubGlobal('window', {}); mockLocalStorage(); mockWindowApi(); });
  afterEach(() => vi.unstubAllGlobals());

  it('persists country metadata through local storage and store hydration', async () => {
    const config = { priority: 'custom' as const, customLocation: { latitude: 35.6, longitude: 139.7, city: 'My city', countryCode: 'JP', country: 'Japan', regionName: 'Tokyo' } };
    saveWeatherLocationConfig(config);
    expect(loadWeatherLocationConfig()).toEqual(config);
    expect(window.api.storeWrite).toHaveBeenCalledWith('weather-location-config', config);
    vi.mocked(window.api.storeRead).mockResolvedValue(config);
    store = {};
    await hydrateWeatherLocationConfigFromStore();
    expect(loadWeatherLocationConfig()).toEqual(config);
  });

  it('keeps legacy coordinate-only configurations valid', () => {
    store.island_weather_location_config = JSON.stringify({ priority: 'custom', customLocation: { latitude: 1, longitude: 2 } });
    expect(loadWeatherLocationConfig()).toEqual({ priority: 'custom', customLocation: { latitude: 1, longitude: 2, city: '' } });
  });

  it('normalizes country codes and rejects invalid metadata', () => {
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: 1, longitude: 2, countryCode: ' jp ', country: 'Japan' } });
    expect(loadWeatherLocationConfig().customLocation?.countryCode).toBe('JP');
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: 1, longitude: 2, countryCode: 'JPN', regionCode: '13' } });
    expect(loadWeatherLocationConfig().customLocation).toEqual({ latitude: 1, longitude: 2, city: '' });
  });
});

describe('normalizeStoredStaticAssetNode', () => {
  it('returns "cos" for "cos"', () => {
    expect(normalizeStoredStaticAssetNode('cos')).toBe('cos');
  });

  it('returns "oss" for "oss"', () => {
    expect(normalizeStoredStaticAssetNode('oss')).toBe('oss');
  });

  it('returns "r2" for "r2"', () => {
    expect(normalizeStoredStaticAssetNode('r2')).toBe('r2');
  });

  it('returns default "r2" for invalid string', () => {
    expect(normalizeStoredStaticAssetNode('invalid')).toBe('r2');
  });

  it('returns default "r2" for undefined', () => {
    expect(normalizeStoredStaticAssetNode(undefined)).toBe('r2');
  });

  it('returns default "r2" for null', () => {
    expect(normalizeStoredStaticAssetNode(null)).toBe('r2');
  });

  it('returns default "r2" for number', () => {
    expect(normalizeStoredStaticAssetNode(123)).toBe('r2');
  });
});

describe('normalizeStaticAssetNode', () => {
  it('pro user gets "cos" when value is "cos"', () => {
    expect(normalizeStaticAssetNode('cos', true)).toBe('cos');
  });

  it('pro user gets "oss" when value is "oss"', () => {
    expect(normalizeStaticAssetNode('oss', true)).toBe('oss');
  });

  it('pro user gets "r2" when value is "r2"', () => {
    expect(normalizeStaticAssetNode('r2', true)).toBe('r2');
  });

  it('pro user gets default "r2" for invalid value', () => {
    expect(normalizeStaticAssetNode('bad', true)).toBe('r2');
  });

  it('pro user gets default "r2" for undefined', () => {
    expect(normalizeStaticAssetNode(undefined, true)).toBe('r2');
  });

  it('non-pro user always gets "r2" regardless of value', () => {
    expect(normalizeStaticAssetNode('cos', false)).toBe('r2');
    expect(normalizeStaticAssetNode('oss', false)).toBe('r2');
    expect(normalizeStaticAssetNode('r2', false)).toBe('r2');
    expect(normalizeStaticAssetNode('bad', false)).toBe('r2');
    expect(normalizeStaticAssetNode(undefined, false)).toBe('r2');
  });
});

describe('loadNetworkConfig', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('returns default config when localStorage is empty', () => {
    const config = loadNetworkConfig();
    expect(config.timeoutMs).toBe(DEFAULT_NETWORK_TIMEOUT_MS);
    expect(config.staticAssetNode).toBe(DEFAULT_STATIC_ASSET_NODE_FREE);
  });

  it('returns stored config when localStorage has valid data', () => {
    store['island_network_config'] = JSON.stringify({ timeoutMs: 5000, staticAssetNode: 'cos' });
    const config = loadNetworkConfig();
    expect(config.timeoutMs).toBe(5000);
    expect(config.staticAssetNode).toBe('cos');
  });

  it('returns default config when stored JSON is malformed', () => {
    store['island_network_config'] = 'not-json';
    const config = loadNetworkConfig();
    expect(config.timeoutMs).toBe(DEFAULT_NETWORK_TIMEOUT_MS);
    expect(config.staticAssetNode).toBe(DEFAULT_STATIC_ASSET_NODE_FREE);
  });

  it('returns default config when timeoutMs is non-positive', () => {
    store['island_network_config'] = JSON.stringify({ timeoutMs: -1, staticAssetNode: 'oss' });
    const config = loadNetworkConfig();
    expect(config.timeoutMs).toBe(DEFAULT_NETWORK_TIMEOUT_MS);
    expect(config.staticAssetNode).toBe(DEFAULT_STATIC_ASSET_NODE_FREE);
  });
});

describe('saveNetworkConfig', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('writes valid config to localStorage', () => {
    saveNetworkConfig({ timeoutMs: 3000, staticAssetNode: 'oss' });
    const written = JSON.parse(store['island_network_config']);
    expect(written.timeoutMs).toBe(3000);
    expect(written.staticAssetNode).toBe('oss');
  });

  it('falls back to default timeout when timeoutMs is invalid', () => {
    saveNetworkConfig({ timeoutMs: -1, staticAssetNode: 'cos' });
    const written = JSON.parse(store['island_network_config']);
    expect(written.timeoutMs).toBe(DEFAULT_NETWORK_TIMEOUT_MS);
    expect(written.staticAssetNode).toBe('cos');
  });

  it('normalizes invalid staticAssetNode to "r2"', () => {
    saveNetworkConfig({ timeoutMs: 5000, staticAssetNode: 'bad' as never });
    const written = JSON.parse(store['island_network_config']);
    expect(written.staticAssetNode).toBe('r2');
  });
});

describe('CWA API key storage', () => {
  beforeEach(() => { vi.stubGlobal('window', {}); mockLocalStorage(); mockWindowApi(); });
  afterEach(() => vi.unstubAllGlobals());

  it('returns an empty string when no key is stored', () => {
    expect(loadCwaApiKey()).toBe('');
  });

  it('trims and persists the key to localStorage and the main store', () => {
    saveCwaApiKey('  CWA-TEST-KEY  ');
    expect(store.island_cwa_api_key).toBe('CWA-TEST-KEY');
    expect(loadCwaApiKey()).toBe('CWA-TEST-KEY');
    expect(window.api.storeWrite).toHaveBeenCalledWith('cwa-api-key', 'CWA-TEST-KEY');
  });

  it('removes the stored key when saving an empty value', () => {
    saveCwaApiKey('CWA-TEST-KEY');
    saveCwaApiKey('   ');
    expect(store.island_cwa_api_key).toBeUndefined();
    expect(loadCwaApiKey()).toBe('');
    expect(window.api.storeWrite).toHaveBeenLastCalledWith('cwa-api-key', '');
  });

  it('hydrates the local cache from the main store', async () => {
    vi.mocked(window.api.storeRead).mockResolvedValue('CWA-FROM-STORE');
    await hydrateCwaApiKeyFromStore();
    expect(loadCwaApiKey()).toBe('CWA-FROM-STORE');
  });

  it('migrates an existing local key into the main store when the store is empty', async () => {
    store.island_cwa_api_key = 'CWA-LOCAL';
    await hydrateCwaApiKeyFromStore();
    expect(window.api.storeWrite).toHaveBeenCalledWith('cwa-api-key', 'CWA-LOCAL');
    expect(loadCwaApiKey()).toBe('CWA-LOCAL');
  });

  it('keeps county and township metadata of a custom location', () => {
    saveWeatherLocationConfig({ priority: 'custom', customLocation: { latitude: 25, longitude: 121.5, city: '新北市新店區', county: '新北市', township: '新店區', countryCode: 'TW', country: '台灣', regionName: '新北市' } });
    expect(loadWeatherLocationConfig().customLocation).toMatchObject({ county: '新北市', township: '新店區' });
  });
});

describe('loadLocationFromStorage', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('returns null when localStorage is empty', () => {
    expect(loadLocationFromStorage()).toBeNull();
  });

  it('returns parsed location when data exists', () => {
    const loc = { latitude: 31.23, longitude: 121.47, city: 'Shanghai', regionName: 'SH', country: 'CN' };
    store['island_location'] = JSON.stringify(loc);
    expect(loadLocationFromStorage()).toEqual(loc);
  });

  it('returns null when JSON is malformed', () => {
    store['island_location'] = '{bad';
    expect(loadLocationFromStorage()).toBeNull();
  });
});

describe('saveLocationToStorage', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('writes location data to localStorage', () => {
    const loc = { latitude: 39.9, longitude: 116.4, city: 'Beijing', regionName: 'BJ', country: 'CN' };
    saveLocationToStorage(loc);
    const written = JSON.parse(store['island_location']);
    expect(written).toEqual(loc);
  });
});

describe('songProgressRingEnabled in storage', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('defaults to true when no value exists in localStorage', () => {
    expect(loadSongProgressRingEnabled()).toBe(true);
  });

  it('loads and saves boolean preference correctly', () => {
    saveSongProgressRingEnabled(false);
    expect(store['island_song_progress_ring_enabled']).toBe('false');
    expect(loadSongProgressRingEnabled()).toBe(false);

    saveSongProgressRingEnabled(true);
    expect(store['island_song_progress_ring_enabled']).toBe('true');
    expect(loadSongProgressRingEnabled()).toBe(true);
  });
});
