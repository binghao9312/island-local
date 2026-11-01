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
 * @file agentQuotaSettingsCard.test.tsx
 * @description Agent 额度卡片设置：字号、显示样式与强调色的保存、自定义色值校验及读取默认值。
 * @author 鸡哥
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { elements, invoke, text } from '../../../../../../../test/tree';

const leaves = vi.hoisted(() => ({
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<unknown>>(),
}));

const STORE_KEY = 'agent-quota-settings';
let Card: typeof import('../AgentQuotaSettingsCard').AgentQuotaSettingsCard;

/**
 * 展开私有函数组件，使断言覆盖颜色输入等子组件的真实输出。
 * @param tree - 元素树
 * @returns 展开后的元素树
 */
function deep(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(deep);
  if (!isValidElement<Record<string, unknown>>(tree)) return tree;
  if (typeof tree.type === 'function') return deep((tree.type as (props: object) => ReactNode)(tree.props));
  const children = tree.props.children as ReactNode;
  return { ...tree, props: { ...tree.props, children: Array.isArray(children) ? children.map(deep) : deep(children) } } as ReactElement;
}

function run(): ReactElement {
  return deep(renderHook(Card)) as ReactElement;
}

async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
}

beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  leaves.storeRead.mockResolvedValue(undefined);
  leaves.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    api: {
      storeRead: leaves.storeRead,
      storeWrite: leaves.storeWrite,
      onSettingsChanged: vi.fn(() => () => {}),
    },
  }));
  Card = (await import('../AgentQuotaSettingsCard')).AgentQuotaSettingsCard;
});

afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

describe('AgentQuotaSettingsCard', () => {
  it('点击字号、显示样式按钮后保存完整设置', async () => {
    await mount();
    const buttons = () => elements(run()).filter((node) => node.props.className?.startsWith?.('settings-layout-btn'));
    // 顺序：字号 小/中/大，显示样式 进度条/紧凑文字
    invoke(buttons()[2], 'onClick');
    expect(leaves.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, {
      fontSize: 'large',
      style: 'bars',
      colors: { claude: '#d97757', codex: '#8da8ff' },
    });
    flushHookEffects();
    invoke(buttons()[4], 'onClick');
    expect(leaves.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, {
      fontSize: 'large',
      style: 'compact',
      colors: { claude: '#d97757', codex: '#8da8ff' },
    });
  });

  it('点击预设色块后只更新对应来源的颜色', async () => {
    await mount();
    const swatches = elements(run()).filter((node) => String(node.props.className ?? '').includes('settings-agent-quota-swatch'));
    invoke(swatches[2], 'onClick');
    expect(leaves.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, {
      fontSize: 'medium',
      style: 'bars',
      colors: { claude: '#7be4ff', codex: '#8da8ff' },
    });
  });

  it('自定义色值只有 #RRGGBB 格式才保存，输入中途只提示不写入', async () => {
    await mount();
    const hexInputs = () => elements(run()).filter((node) => node.props.className === 'settings-agent-quota-hex');
    invoke(hexInputs()[1], 'onChange', { target: { value: '#00ff7' } });
    expect(leaves.storeWrite).not.toHaveBeenCalled();
    expect(text(run())).toContain('settings.app.layout.agentQuota.invalidHex');

    invoke(hexInputs()[1], 'onChange', { target: { value: '#00ff7f' } });
    expect(leaves.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, {
      fontSize: 'medium',
      style: 'bars',
      colors: { claude: '#d97757', codex: '#00ff7f' },
    });
  });

  it('读取到已保存的设置时以其为当前选中项', async () => {
    leaves.storeRead.mockResolvedValue({ fontSize: 'small', style: 'compact', colors: { claude: '#123456', codex: '#8da8ff' } });
    await mount();
    const tree = run();
    const active = elements(tree).filter((node) => String(node.props.className ?? '').includes('settings-layout-btn') && String(node.props.className).includes('active'));
    // 测试用 t 会在翻译键后拼接选项，比较时只取键名部分。
    expect(active.map((node) => text(node).split(':')[0])).toEqual(['settings.app.layout.agentQuota.fontSmall', 'settings.app.layout.agentQuota.styleCompact']);
  });
});
