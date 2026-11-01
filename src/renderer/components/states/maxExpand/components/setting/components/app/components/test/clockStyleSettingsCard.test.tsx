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
 * @file clockStyleSettingsCard.test.tsx
 * @description 时钟样式设置卡片单元测试：色彩模式、字体、字号、字重、时间制式与日期行配置及持久化
 * @author 鸡哥
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { elements, invoke, text } from '../../../../../../../test/tree';
import { ClockStyleSettingsCard } from '../ClockStyleSettingsCard';
const leaves = vi.hoisted(() => {
  const storeRead = vi.fn<(key: string) => Promise<unknown>>();
  const storeWrite = vi.fn<(key: string, value: unknown) => Promise<unknown>>();
  const onSettingsChanged = vi.fn(() => () => {});
  vi.stubGlobal('window', {
    api: { storeRead, storeWrite, onSettingsChanged },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  return { storeRead, storeWrite, onSettingsChanged };
});

const STORE_KEY = 'overview-clock-config';

vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

vi.mock('../../../../../../../../../store/slices', () => ({
  default: (selector?: (state: { dominantColor: number[] }) => unknown) => {
    const state = { dominantColor: [100, 180, 255] };
    return selector ? selector(state) : state;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

function deep(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(deep);
  if (!isValidElement<Record<string, unknown>>(tree)) return tree;
  if (typeof tree.type === 'function') return deep((tree.type as (props: object) => ReactNode)(tree.props));
  const children = tree.props.children as ReactNode;
  return { ...tree, props: { ...tree.props, children: Array.isArray(children) ? children.map(deep) : deep(children) } } as ReactElement;
}

function run(): ReactElement {
  return deep(renderHook(ClockStyleSettingsCard)) as ReactElement;
}

async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
}

beforeEach(() => {
  unmountHook();
  resetHook();
  vi.clearAllMocks();
  leaves.storeRead.mockResolvedValue(undefined);
  leaves.storeWrite.mockResolvedValue(true);
  leaves.onSettingsChanged.mockReturnValue(() => {});
  vi.stubGlobal('window', {
    api: {
      storeRead: leaves.storeRead,
      storeWrite: leaves.storeWrite,
      onSettingsChanged: leaves.onSettingsChanged,
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

describe('ClockStyleSettingsCard', () => {
  it('renders title, subtitle, and live preview box', async () => {
    await mount();
    const tree = run();
    expect(elements(tree).filter((n) => n.props?.className === 'settings-clock-preview-box')).toHaveLength(1);
    expect(elements(tree).filter((n) => n.props?.className === 'settings-clock-preview-digits')).toHaveLength(1);
  });

  it('switches color mode between auto, solid, gradient, and album', async () => {
    await mount();
    let tree = run();

    // Click '纯色' button
    const solidBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.colorModes.solid'))[0];
    invoke(solidBtn, 'onClick');
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ colorMode: 'solid' }));

    tree = run();
    // In solid mode, preset swatches are rendered
    const swatches = elements(tree).filter((n) => typeof n.props?.className === 'string' && n.props.className.includes('settings-agent-quota-swatch'));
    expect(swatches.length).toBeGreaterThanOrEqual(8);

    // Click '双色渐变' button
    const gradBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.colorModes.gradient'))[0];
    invoke(gradBtn, 'onClick');
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ colorMode: 'gradient' }));

    tree = run();
    // In gradient mode, gradient preset buttons are rendered
    const gradSwatches = elements(tree).filter((n) => typeof n.props?.className === 'string' && n.props.className.includes('settings-clock-gradient-swatch'));
    expect(gradSwatches.length).toBe(6);

    // Click '跟随专辑主色' button
    const albumBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.colorModes.album'))[0];
    invoke(albumBtn, 'onClick');
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ colorMode: 'album' }));
  });


  it('updates solidColor when clicking swatch or typing valid hex', async () => {
    leaves.storeRead.mockResolvedValue({ colorMode: 'solid', solidColor: '#ffffff' });
    await mount();
    let tree = run();

    const swatches = elements(tree).filter((n) => typeof n.props?.className === 'string' && n.props.className.includes('settings-agent-quota-swatch'));
    invoke(swatches[1], 'onClick');
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ solidColor: '#7be4ff' }));

    tree = run();
    const hexInput = elements(tree).filter((n) => n.type === 'input' && n.props?.className === 'settings-agent-quota-hex')[0];
    invoke(hexInput, 'onChange', { target: { value: '#112233' } });
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ solidColor: '#112233' }));
  });

  it('updates gradientStart and gradientEnd when clicking gradient preset', async () => {
    leaves.storeRead.mockResolvedValue({ colorMode: 'gradient' });
    await mount();
    const tree = run();

    const gradSwatches = elements(tree).filter((n) => typeof n.props?.className === 'string' && n.props.className.includes('settings-clock-gradient-swatch'));
    invoke(gradSwatches[1], 'onClick');
    flushHookEffects();

    expect(leaves.storeWrite).toHaveBeenCalledWith(
      STORE_KEY,
      expect.objectContaining({ gradientStart: '#ff7e5f', gradientEnd: '#feb47b' }),
    );
  });

  it('updates font family, weight, and size', async () => {
    await mount();
    const tree = run();

    // Font family button
    const consolasBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.fonts.consolas'))[0];
    invoke(consolasBtn, 'onClick');
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ fontFamily: 'consolas' }));

    // Weight button
    const boldBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.weights.bold'))[0];
    invoke(boldBtn, 'onClick');
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ fontWeight: 'bold' }));

    // Size button
    const sizeBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.sizes.small'))[0];
    invoke(sizeBtn, 'onClick');
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ fontSize: 'small' }));
  });

  it('toggles 12h/24h and showSeconds', async () => {
    await mount();
    let tree = run();

    const format12Btn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.format12'))[0];
    invoke(format12Btn, 'onClick');
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ is24Hour: false }));

    tree = run();
    const secondsCheckbox = elements(tree).filter((n) => n.type === 'input' && n.props?.type === 'checkbox')[0];
    invoke(secondsCheckbox, 'onChange', { target: { checked: true } });
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ showSeconds: true }));
  });

  it('toggles date line visibility and date format', async () => {
    await mount();
    let tree = run();

    // Checkboxes: first is showSeconds, second is showDate
    const checkboxes = elements(tree).filter((n) => n.type === 'input' && n.props?.type === 'checkbox');

    invoke(checkboxes[1], 'onChange', { target: { checked: false } });
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ showDate: false }));

    invoke(checkboxes[1], 'onChange', { target: { checked: true } });
    flushHookEffects();

    tree = run();
    const slashBtn = elements(tree).filter((n) => n.type === 'button' && text(n).includes('settings.app.layout.clock.dateFormats.slash'))[0];
    invoke(slashBtn, 'onClick');
    flushHookEffects();
    expect(leaves.storeWrite).toHaveBeenCalledWith(STORE_KEY, expect.objectContaining({ dateFormat: 'slash' }));
  });
});
