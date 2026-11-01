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
 * @file useCountdownEdit.ts
 * @description 可编辑计时器逻辑 Hook（状态管理、输入处理、倒计时控制）
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useCallback, useEffect, useRef, useState } from 'react';
import useIslandStore from '../../../../../../store/slices';
import type { TimerState } from '../types/timeTabTypes';
import { padZero, getTimeParts, sanitizeTimeDigits, clampTimeField, getTotalSeconds } from '../utils/timerUtils';

/** 时/分/秒输入框对应的 store 字段名 */
export type TimerInputField = 'inputHours' | 'inputMinutes' | 'inputSeconds';

/** 当前获得焦点的输入框及其未提交草稿，field 为 null 表示无草稿 */
interface TimerDraft {
  field: TimerInputField | null;
  value: string;
}

const NO_DRAFT: TimerDraft = { field: null, value: '' };

/**
 * 可编辑计时器逻辑 Hook
 * @description 管理倒计时状态、输入框草稿与开始/暂停/重置控制。
 * 输入框聚焦期间展示本地草稿（允许输入过程中的任意 0~2 位数字），
 * 失焦或回车时才限制上限、补零并写入 store，避免受控输入被每次补零导致无法键入
 * @returns 计时器状态与操作回调
 */
export function useCountdownEdit(): {
  timerState: TimerState;
  isEditing: boolean;
  inputHours: string;
  inputMinutes: string;
  inputSeconds: string;
  h: number;
  m: number;
  s: number;
  timerInputsRef: React.RefObject<HTMLDivElement | null>;
  getFieldValue: (field: TimerInputField) => string;
  handleFieldFocus: (field: TimerInputField, input: { select: () => void }) => void;
  handleInputChange: (value: string, field: TimerInputField) => void;
  handleFieldCommit: (field: TimerInputField, max: number) => void;
  handleFieldKeyDown: (key: string, field: TimerInputField, max: number) => boolean;
  handleStart: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleReset: () => void;
} {
  const { timerData, setTimerData } = useIslandStore(useShallow((store) => ({
    timerData: store.timerData,
    setTimerData: store.setTimerData,
  })));

  const timerState: TimerState = timerData?.state ?? 'idle';
  const remainingSeconds: number = timerData?.remainingSeconds ?? 0;
  const inputHours: string = timerData?.inputHours ?? '00';
  const inputMinutes: string = timerData?.inputMinutes ?? '00';
  const inputSeconds: string = timerData?.inputSeconds ?? '00';

  const [draft, setDraft] = useState<TimerDraft>(NO_DRAFT);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const timerDataRef = useRef(timerData);
  timerDataRef.current = timerData;
  const setTimerDataRef = useRef(setTimerData);
  setTimerDataRef.current = setTimerData;
  const timerInputsRef = useRef<HTMLDivElement>(null);
  const isEditing = timerState === 'idle';

  const getFieldValue = useCallback((field: TimerInputField): string => (
    draft.field === field ? draft.value : (timerData?.[field] ?? '00')
  ), [draft, timerData]);

  const handleFieldFocus = useCallback((field: TimerInputField, input: { select: () => void }) => {
    setDraft({ field, value: timerDataRef.current?.[field] ?? '00' });
    input.select();
  }, []);

  const handleInputChange = useCallback((value: string, field: TimerInputField) => {
    setDraft({ field, value: sanitizeTimeDigits(value) });
  }, []);

  const handleFieldCommit = useCallback((field: TimerInputField, max: number) => {
    const current = draftRef.current;
    if (current.field !== field) return;
    setDraft(NO_DRAFT);
    setTimerDataRef.current({ [field]: clampTimeField(current.value, max) });
  }, []);

  /**
   * 处理输入框按键，回车提交草稿并在总时长大于 0 时启动倒计时
   * @returns 是否消费了该按键（调用方据此 preventDefault）
   */
  const handleFieldKeyDown = useCallback((key: string, field: TimerInputField, max: number): boolean => {
    if (key !== 'Enter') return false;
    const current = draftRef.current;
    const data = timerDataRef.current;
    const committed = current.field === field ? clampTimeField(current.value, max) : (data?.[field] ?? '00');
    const values = {
      inputHours: data?.inputHours ?? '00',
      inputMinutes: data?.inputMinutes ?? '00',
      inputSeconds: data?.inputSeconds ?? '00',
      [field]: committed,
    };
    const total = getTotalSeconds(values.inputHours, values.inputMinutes, values.inputSeconds);
    setDraft(NO_DRAFT);
    setTimerDataRef.current(total > 0
      ? { ...values, state: 'running', remainingSeconds: total, totalSeconds: total }
      : { [field]: committed });
    return true;
  }, []);

  useEffect(() => {
    const el = timerInputsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      const setter = target.getAttribute('data-setter') as TimerInputField | null;
      const maxStr = target.getAttribute('data-max');
      if (!setter || !maxStr) return;
      e.preventDefault();
      const max = parseInt(maxStr, 10);
      const delta = e.deltaY < 0 ? 1 : -1;
      const currentStr = timerDataRef.current?.[setter] ?? '00';
      const current = parseInt(currentStr, 10) || 0;
      let next = current + delta;
      if (next < 0) next = max;
      if (next > max) next = 0;
      // 聚焦字段的草稿优先于 store 显示，滚轮改动需同步进草稿，否则界面看起来没变化
      setDraft((previous) => (previous.field === setter ? { field: setter, value: padZero(next) } : previous));
      setTimerDataRef.current({ [setter]: padZero(next) });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isEditing]);

  const handleStart = useCallback(() => {
    const total = getTotalSeconds(inputHours, inputMinutes, inputSeconds);

    if (total > 0) {
      setDraft(NO_DRAFT);
      setTimerData({
        state: 'running',
        remainingSeconds: total,
        totalSeconds: total,
      });
    }
  }, [inputHours, inputMinutes, inputSeconds, setTimerData]);

  const handlePause = useCallback(() => {
    setTimerData({ state: 'paused' });
  }, [setTimerData]);

  const handleResume = useCallback(() => {
    if (remainingSeconds > 0) {
      setTimerData({ state: 'running' });
    }
  }, [remainingSeconds, setTimerData]);

  const handleReset = useCallback(() => {
    setDraft(NO_DRAFT);
    setTimerData({
      state: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      inputHours: '00',
      inputMinutes: '00',
      inputSeconds: '00',
    });
  }, [setTimerData]);

  const { h, m, s } = getTimeParts(remainingSeconds);

  return {
    timerState,
    isEditing,
    inputHours,
    inputMinutes,
    inputSeconds,
    h,
    m,
    s,
    timerInputsRef,
    getFieldValue,
    handleFieldFocus,
    handleInputChange,
    handleFieldCommit,
    handleFieldKeyDown,
    handleStart,
    handlePause,
    handleResume,
    handleReset,
  };
}
