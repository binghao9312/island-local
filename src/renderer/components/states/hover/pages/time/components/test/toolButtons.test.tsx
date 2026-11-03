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
 * @file toolButtons.test.tsx
 * @description ToolButtons 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { elements, invoke, text } from '../../../../../test/tree';
import { ToolButtons } from '../ToolButtons';
import type { TreeElement } from '../../../../../test/tree';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const storeState = vi.hoisted(() => ({
  timerData: { state: 'idle', remainingSeconds: 0 },
  pomodoroRunning: false,
}));
const pomodoro = vi.hoisted(() => ({ togglePomodoro: vi.fn() }));
vi.mock('../../../../../../../components/states/expand/pages/OverviewTab/components/widgets/PomodoroWidget', () => pomodoro);
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

const model = vi.hoisted(() => ({ handleTaskManager: vi.fn() }));
vi.mock('../../hooks/useToolButtons', () => ({ useToolButtons: () => model }));

describe('ToolButtons', () => {
  it('forwards tool actions and renders accessible icons including timer toggle', () => {
    storeState.timerData = { state: 'idle', remainingSeconds: 0 };
    const onToggleCountdown = vi.fn();
    const root = ToolButtons({ onToggleCountdown, isCountdownOpen: false }) as TreeElement;
    const buttons = elements(root).filter((node) => node.type === 'button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => invoke(button, 'onClick'));
    expect(onToggleCountdown).toHaveBeenCalledOnce();
    expect(pomodoro.togglePomodoro).toHaveBeenCalledOnce();
    expect(model.handleTaskManager).toHaveBeenCalledOnce();
    expect(elements(root).filter((node) => node.type === 'img').every((node) => typeof node.props.alt === 'string')).toBe(true);
  });

  it('marks the pomodoro button pressed only while the pomodoro is running', () => {
    const pomodoroButton = (): TreeElement => {
      const root = ToolButtons() as TreeElement;
      return elements(root).filter((node) => node.type === 'button')
        .find((node) => node.props.title === 'hover.tools.pomodoro') as TreeElement;
    };
    storeState.pomodoroRunning = false;
    expect(pomodoroButton().props.className).not.toContain('is-active');
    expect(pomodoroButton().props['aria-pressed']).toBe(false);
    storeState.pomodoroRunning = true;
    expect(pomodoroButton().props.className).toContain('is-active');
    expect(pomodoroButton().props['aria-pressed']).toBe(true);
    storeState.pomodoroRunning = false;
  });

  it('renders remaining mm:ss text badge when timer is running or paused', () => {
    storeState.timerData = { state: 'running', remainingSeconds: 125 };
    const root = ToolButtons() as TreeElement;
    expect(text(root)).toContain('02:05');

    storeState.timerData = { state: 'paused', remainingSeconds: 59 };
    const pausedRoot = ToolButtons() as TreeElement;
    expect(text(pausedRoot)).toContain('00:59');
  });
});
