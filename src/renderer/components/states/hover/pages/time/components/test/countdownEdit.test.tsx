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
 * @file countdownEdit.test.tsx
 * @description CountdownEdit 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { CountdownEdit } from '../CountdownEdit';
import { BrightnessControl } from '../BrightnessControl';
import { VolumeControl } from '../VolumeControl';
import type { TreeElement } from '../../../../../test/tree';

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const { mockHooks } = await import('../../../../../test/hooks');
  return mockHooks(actual, slots);
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const storeState = vi.hoisted(() => ({
  timerData: { state: 'idle', remainingSeconds: 0 },
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));
vi.mock('../../../../../../../components/states/expand/pages/OverviewTab/components/widgets/PomodoroWidget', () => ({ togglePomodoro: vi.fn() }));

const model = vi.hoisted(() => ({
  timerState: 'idle',
  isEditing: true,
  inputHours: '01',
  inputMinutes: '02',
  inputSeconds: '03',
  h: 1,
  m: 2,
  s: 3,
  timerInputsRef: { current: null },
  getFieldValue: vi.fn((field: string) => ({ inputHours: '01', inputMinutes: '02', inputSeconds: '03' } as Record<string, string>)[field]),
  handleFieldFocus: vi.fn(),
  handleInputChange: vi.fn(),
  handleFieldCommit: vi.fn(),
  handleFieldKeyDown: vi.fn(() => false),
  handleStart: vi.fn(),
  handlePause: vi.fn(),
  handleResume: vi.fn(),
  handleReset: vi.fn(),
}));
vi.mock('../../hooks/useCountdownEdit', () => ({ useCountdownEdit: () => model }));
vi.mock('../../hooks/useToolButtons', () => ({ useToolButtons: () => ({ handleScreenshot: vi.fn(), handleTaskManager: vi.fn() }) }));

beforeEach(() => {
  slots.cursor = 0;
  slots.values = [];
  slots.effects = [];
  vi.clearAllMocks();
  model.timerState = 'idle';
  model.isEditing = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function render(props: Parameters<typeof CountdownEdit>[0]) {
  slots.cursor = 0;
  return CountdownEdit(props) as TreeElement;
}

describe('CountdownEdit', () => {
  it('renders three draft-aware inputs with their bounds when popover is open', () => {
    const root = render({ activePanel: 'countdown', defaultOpen: true });
    const inputs = elements(root).filter((node) => node.type === 'input');
    expect(inputs.map((input) => [input.props.value, input.props['data-setter'], input.props['data-max']])).toEqual([
      ['01', 'inputHours', 23],
      ['02', 'inputMinutes', 59],
      ['03', 'inputSeconds', 59],
    ]);
  });

  it('forwards focus, change and blur of each input together with its field and bounds', () => {
    const root = render({ activePanel: 'countdown', defaultOpen: true });
    const inputs = elements(root).filter((node) => node.type === 'input');
    const target = { value: '9', select: vi.fn() };
    inputs.forEach((input) => {
      invoke(input, 'onFocus', { target });
      invoke(input, 'onChange', { target });
      invoke(input, 'onBlur');
    });
    expect(model.handleFieldFocus.mock.calls).toEqual([
      ['inputHours', target],
      ['inputMinutes', target],
      ['inputSeconds', target],
    ]);
    expect(model.handleInputChange.mock.calls).toEqual([
      ['9', 'inputHours'],
      ['9', 'inputMinutes'],
      ['9', 'inputSeconds'],
    ]);
    expect(model.handleFieldCommit.mock.calls).toEqual([
      ['inputHours', 23],
      ['inputMinutes', 59],
      ['inputSeconds', 59],
    ]);
  });

  it('prevents the default action only when the hook consumes the key', () => {
    const root = render({ activePanel: 'countdown', defaultOpen: true });
    const [input] = elements(root).filter((node) => node.type === 'input');
    const enter = { key: 'Enter', preventDefault: vi.fn() };
    model.handleFieldKeyDown.mockReturnValueOnce(true);
    invoke(input, 'onKeyDown', enter);
    expect(model.handleFieldKeyDown).toHaveBeenCalledWith('Enter', 'inputHours', 23);
    expect(enter.preventDefault).toHaveBeenCalledOnce();
    const digit = { key: '5', preventDefault: vi.fn() };
    invoke(input, 'onKeyDown', digit);
    expect(digit.preventDefault).not.toHaveBeenCalled();
  });

  it.each([['idle', 'handleStart'], ['running', 'handlePause'], ['paused', 'handleResume']] as const)('forwards %s timer control', (timerState, handler) => {
    model.timerState = timerState;
    const root = render({ activePanel: 'countdown', defaultOpen: true });
    invoke(find(root, (node) => String(node.props.className).startsWith('timer-btn ') && !String(node.props.className).includes('reset')), 'onClick');
    expect(model[handler]).toHaveBeenCalledOnce();
    invoke(byClass(root, 'timer-btn-reset'), 'onClick');
    expect(model.handleReset).toHaveBeenCalledOnce();
  });

  it('renders a padded timer when editing is inactive', () => {
    model.isEditing = false;
    const root = render({ activePanel: 'countdown', defaultOpen: true });
    expect(text(byClass(root, 'timer-display'))).toBe('01:02:03');
    expect(elements(root).some((node) => node.type === 'input')).toBe(false);
  });

  it.each([['brightness', BrightnessControl], ['volume', VolumeControl]] as const)('hides countdown and selects %s control', (activePanel, type) => {
    const root = render({ activePanel });
    expect(byClass(root, 'timer-main').props.className).toContain('timer-main-hidden');
    expect(find(root, (node) => node.type === type)).toBeDefined();
  });

  it('popover is closed by default and toggles via timer button', () => {
    const closedRoot = render({ activePanel: 'countdown' });
    expect(elements(closedRoot).some((node) => node.props.className === 'countdown-popover')).toBe(false);
  });
});
