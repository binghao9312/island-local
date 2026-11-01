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
 * @file useOverviewClockSettings.test.ts
 * @description 总览时钟样式 Hook 的读取、IPC 广播同步与保存测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERVIEW_CLOCK_CONFIG, OVERVIEW_CLOCK_CONFIG_STORE_KEY } from '../../config/overviewConfig';
import { useOverviewClockSettings } from '../useOverviewClockSettings';
import {
  deferred,
  flushHookEffects,
  renderHook,
  resetHook,
  settleHook,
  unmountHook,
} from '../../../../../../hooks/test/startupHookHarness';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

const read = vi.fn();
const write = vi.fn();
const unsubscribe = vi.fn();
let notify!: (channel: string, value: unknown) => void;

beforeEach(() => {
  resetHook();
  read.mockReset().mockResolvedValue({ colorMode: 'solid', solidColor: '#123456' });
  write.mockReset().mockResolvedValue(true);
  unsubscribe.mockReset();
  vi.stubGlobal('window', {
    api: {
      storeRead: read,
      storeWrite: write,
      onSettingsChanged: (listener: typeof notify) => {
        notify = listener;
        return unsubscribe;
      },
    },
  });
});

afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

describe('useOverviewClockSettings', () => {
  it('loads config from storage and syncs via IPC broadcasts', async () => {
    // Initial state is default before effect runs
    const initial = renderHook(useOverviewClockSettings);
    expect(initial[0]).toEqual(DEFAULT_OVERVIEW_CLOCK_CONFIG);

    flushHookEffects();
    await settleHook();

    const afterRead = renderHook(useOverviewClockSettings);
    expect(afterRead[0].colorMode).toBe('solid');
    expect(afterRead[0].solidColor).toBe('#123456');

    // Ignore unrelated channel
    notify('unrelated-channel', { colorMode: 'gradient' });
    expect(renderHook(useOverviewClockSettings)[0].colorMode).toBe('solid');

    // Handle store channel
    notify(`store:${OVERVIEW_CLOCK_CONFIG_STORE_KEY}`, {
      colorMode: 'album',
      fontSize: 'small',
    });
    const afterNotify = renderHook(useOverviewClockSettings);
    expect(afterNotify[0].colorMode).toBe('album');
    expect(afterNotify[0].fontSize).toBe('small');
  });

  it('updates local state immediately and writes to store', () => {
    const [, updateConfig] = renderHook(useOverviewClockSettings);
    updateConfig({ colorMode: 'solid', solidColor: '#abcdef' });

    expect(write).toHaveBeenCalledWith(
      OVERVIEW_CLOCK_CONFIG_STORE_KEY,
      expect.objectContaining({ colorMode: 'solid', solidColor: '#abcdef' }),
    );
    expect(renderHook(useOverviewClockSettings)[0].solidColor).toBe('#abcdef');
  });

  it('cleans up subscription and cancels late read on unmount', async () => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);

    renderHook(useOverviewClockSettings);
    flushHookEffects();
    unmountHook();

    expect(unsubscribe).toHaveBeenCalled();
    pending.resolve({ colorMode: 'gradient' });
    await settleHook();
  });
});
