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
 * @file useCountdownEditRuntime.test.ts
 * @description 计时编辑真实输入、滚轮进位、最新状态引用、启动暂停恢复与监听清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { TimerData } from '../../../../../../../store/types';
const store = vi.hoisted(() => ({
  timerData: undefined as Partial<TimerData> | undefined,
  setTimerData: vi.fn<(data: Partial<TimerData>) => void>()
}));
// 状态 hook 在此测试直接调用；浅比较由 Zustand 负责，保留选择器输入。
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
vi.mock('../../../../../../../store/slices', () => ({
  default: () => store
}));
const {
  useCountdownEdit
} = await import('../useCountdownEdit');
/** 读取同一实例的真实 Hook 状态。
 * @returns 计时编辑状态及实际回调
 */
function run(): ReturnType<typeof useCountdownEdit> {
  return renderHook(useCountdownEdit);
}
/** 挂载原生输入容器。
 * @returns 原生叶节点与滚轮回调
 */
function attach() {
  let wheel: ((event: WheelEvent) => void) | undefined;
  const element = {
    addEventListener: vi.fn((name: string, handler: (event: WheelEvent) => void) => {
      expect(name).toBe('wheel');
      wheel = handler;
    }),
    removeEventListener: vi.fn()
  };
  const {
    timerInputsRef
  } = run();
  timerInputsRef.current = element as unknown as HTMLDivElement;
  flushHookEffects();
  return {
    element,
    wheel: (deltaY: number, setter: string | null = 'inputSeconds', max: string | null = '59') => {
      const preventDefault = vi.fn();
      const getAttribute = vi.fn((name: string) => name === 'data-setter' ? setter : max);
      wheel?.({
        deltaY,
        preventDefault,
        target: {
          getAttribute
        }
      } as unknown as WheelEvent);
      return preventDefault;
    }
  };
}
beforeEach(() => {
  resetHook();
  store.timerData = {
    state: 'idle',
    remainingSeconds: 0,
    inputHours: '00',
    inputMinutes: '00',
    inputSeconds: '00'
  };
  store.setTimerData = vi.fn();
});
afterEach(() => {
  unmountHook();
});
describe('useCountdownEdit runtime', () => {
  it('uses default fields for absent store data and skips absent input node', () => {
    store.timerData = undefined;
    const result = run();
    flushHookEffects();
    expect(result).toMatchObject({
      timerState: 'idle',
      isEditing: true,
      inputHours: '00',
      inputMinutes: '00',
      inputSeconds: '00',
      h: 0,
      m: 0,
      s: 0
    });
    expect(result.getFieldValue('inputHours')).toBe('00');
  });
  it('reads full running state and decomposes remaining seconds with real utility', () => {
    store.timerData = {
      state: 'running',
      remainingSeconds: 3723,
      inputHours: '01',
      inputMinutes: '02',
      inputSeconds: '03'
    };
    expect(run()).toMatchObject({
      timerState: 'running',
      isEditing: false,
      inputHours: '01',
      inputMinutes: '02',
      inputSeconds: '03',
      h: 1,
      m: 2,
      s: 3
    });
  });
  it('typing keeps a local draft and does not touch the store until commit', () => {
    store.timerData = {
      inputMinutes: '00'
    };
    const input = {
      select: vi.fn()
    };
    run().handleFieldFocus('inputMinutes', input);
    expect(input.select).toHaveBeenCalledOnce();
    run().handleInputChange('5', 'inputMinutes');
    expect(run().getFieldValue('inputMinutes')).toBe('5');
    run().handleInputChange('5a7x', 'inputMinutes');
    expect(run().getFieldValue('inputMinutes')).toBe('57');
    run().handleInputChange('123', 'inputMinutes');
    expect(run().getFieldValue('inputMinutes')).toBe('12');
    run().handleInputChange('', 'inputMinutes');
    expect(run().getFieldValue('inputMinutes')).toBe('');
    expect(run().getFieldValue('inputHours')).toBe('00');
    expect(store.setTimerData).not.toHaveBeenCalled();
  });
  it.each([['7', '07'], ['59', '59'], ['60', '59'], ['99', '59'], ['', '00']] as const)('commits draft %s as %s clamped to maximum 59', (input, expected) => {
    store.timerData = {
      inputSeconds: '09'
    };
    run().handleFieldFocus('inputSeconds', {
      select: vi.fn()
    });
    run().handleInputChange(input, 'inputSeconds');
    run().handleFieldCommit('inputSeconds', 59);
    expect(store.setTimerData).toHaveBeenCalledExactlyOnceWith({
      inputSeconds: expected
    });
    expect(run().getFieldValue('inputSeconds')).toBe('09');
  });
  it('clamps hours to 23 and ignores commits for fields without a draft', () => {
    run().handleFieldCommit('inputHours', 23);
    expect(store.setTimerData).not.toHaveBeenCalled();
    run().handleFieldFocus('inputHours', {
      select: vi.fn()
    });
    run().handleInputChange('45', 'inputHours');
    run().handleFieldCommit('inputMinutes', 59);
    expect(store.setTimerData).not.toHaveBeenCalled();
    run().handleFieldCommit('inputHours', 23);
    expect(store.setTimerData).toHaveBeenCalledExactlyOnceWith({
      inputHours: '23'
    });
  });
  it('Enter ignores other keys, commits the draft and starts the timer when total is positive', () => {
    store.timerData = {
      inputHours: '00',
      inputMinutes: '01',
      inputSeconds: '00'
    };
    run().handleFieldFocus('inputSeconds', {
      select: vi.fn()
    });
    run().handleInputChange('30', 'inputSeconds');
    expect(run().handleFieldKeyDown('a', 'inputSeconds', 59)).toBe(false);
    expect(store.setTimerData).not.toHaveBeenCalled();
    expect(run().handleFieldKeyDown('Enter', 'inputSeconds', 59)).toBe(true);
    expect(store.setTimerData).toHaveBeenCalledExactlyOnceWith({
      inputHours: '00',
      inputMinutes: '01',
      inputSeconds: '30',
      state: 'running',
      remainingSeconds: 90,
      totalSeconds: 90
    });
    expect(run().getFieldValue('inputSeconds')).toBe('00');
  });
  it('Enter with a zero total only commits the field and does not start', () => {
    store.timerData = {};
    run().handleFieldFocus('inputSeconds', {
      select: vi.fn()
    });
    run().handleInputChange('', 'inputSeconds');
    run().handleFieldKeyDown('Enter', 'inputSeconds', 59);
    expect(store.setTimerData).toHaveBeenCalledExactlyOnceWith({
      inputSeconds: '00'
    });
  });
  it('Enter without a draft for that field uses stored values and clamps drafts above the maximum', () => {
    store.timerData = {
      inputMinutes: '02'
    };
    run().handleFieldKeyDown('Enter', 'inputHours', 23);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputHours: '00',
      inputMinutes: '02',
      inputSeconds: '00',
      state: 'running',
      remainingSeconds: 120,
      totalSeconds: 120
    });
    store.timerData = undefined;
    run().handleFieldFocus('inputMinutes', {
      select: vi.fn()
    });
    run().handleInputChange('99', 'inputMinutes');
    run().handleFieldKeyDown('Enter', 'inputMinutes', 59);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputHours: '00',
      inputMinutes: '59',
      inputSeconds: '00',
      state: 'running',
      remainingSeconds: 3540,
      totalSeconds: 3540
    });
  });
  it('wheel ignores unrelated descendants without setter or maximum', () => {
    const view = attach();
    expect(view.wheel(1, null)).not.toHaveBeenCalled();
    expect(view.wheel(1, 'inputHours', null)).not.toHaveBeenCalled();
    expect(store.setTimerData).not.toHaveBeenCalled();
  });
  it('wheel wraps above and below boundaries and uses the latest current data', () => {
    const view = attach();
    view.wheel(1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '59'
    });
    store.timerData = {
      inputSeconds: '59'
    };
    run();
    expect(view.wheel(-1)).toHaveBeenCalledTimes(1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '00'
    });
    store.timerData = {
      inputSeconds: '10'
    };
    run();
    view.wheel(-1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '11'
    });
    view.wheel(1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '09'
    });
  });
  it('wheel handles missing or nonnumeric current data and updated setter without resubscription', () => {
    const view = attach();
    const original = store.setTimerData;
    store.timerData = undefined;
    store.setTimerData = vi.fn();
    run();
    view.wheel(-1);
    expect(original).not.toHaveBeenCalled();
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '01'
    });
    store.timerData = {
      inputSeconds: 'bad'
    };
    run();
    view.wheel(-1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '01'
    });
    expect(view.element.addEventListener).toHaveBeenCalledTimes(1);
  });
  it('state transitions replace wheel listener and final unmount removes exact registered callback', () => {
    const view = attach();
    store.timerData = {
      state: 'running'
    };
    run();
    flushHookEffects();
    expect(view.element.removeEventListener).toHaveBeenCalledTimes(1);
    const [[, callback]] = view.element.addEventListener.mock.calls;
    expect(view.element.removeEventListener).toHaveBeenCalledWith('wheel', callback);
    unmountHook();
    expect(view.element.removeEventListener).toHaveBeenCalledTimes(2);
  });
  it('starts with summed input units and ignores zero or nonnumeric duration', () => {
    run().handleStart();
    expect(store.setTimerData).not.toHaveBeenCalled();
    store.timerData = {
      inputHours: 'bad',
      inputMinutes: 'bad',
      inputSeconds: 'bad'
    };
    run().handleStart();
    expect(store.setTimerData).not.toHaveBeenCalled();
    store.timerData = {
      inputHours: '1',
      inputMinutes: '2',
      inputSeconds: '3'
    };
    run().handleStart();
    expect(store.setTimerData).toHaveBeenCalledExactlyOnceWith({
      state: 'running',
      remainingSeconds: 3723,
      totalSeconds: 3723
    });
  });
  it('pause, resume and reset preserve their documented state updates', () => {
    run().handlePause();
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      state: 'paused'
    });
    store.setTimerData.mockClear();
    run().handleResume();
    expect(store.setTimerData).not.toHaveBeenCalled();
    store.timerData = {
      remainingSeconds: 1
    };
    run().handleResume();
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      state: 'running'
    });
    run().handleReset();
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      state: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      inputHours: '00',
      inputMinutes: '00',
      inputSeconds: '00'
    });
  });
  it('wheel on the focused field replaces its draft so the display follows', () => {
    store.timerData = {
      inputSeconds: '10'
    };
    const view = attach();
    run().handleFieldFocus('inputSeconds', {
      select: vi.fn()
    });
    run().handleInputChange('3', 'inputSeconds');
    view.wheel(-1);
    expect(store.setTimerData).toHaveBeenLastCalledWith({
      inputSeconds: '11'
    });
    expect(run().getFieldValue('inputSeconds')).toBe('11');
  });
});
