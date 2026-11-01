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
 * @file CountdownEdit.tsx
 * @description 倒计时悬浮弹出面板与工具栏组件
 * @author 鸡哥
 */

import { Fragment, useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { BrightnessControl } from './BrightnessControl';
import { ToolButtons } from './ToolButtons';
import { VolumeControl } from './VolumeControl';
import { useCountdownEdit, type TimerInputField } from '../hooks/useCountdownEdit';
import type { TimePanelMode } from '../types/timeTabTypes';
import { padZero } from '../utils/timerUtils';

/** 三个输入框的 store 字段与上限 */
const TIMER_FIELDS: { field: TimerInputField; max: number }[] = [
  { field: 'inputHours', max: 23 },
  { field: 'inputMinutes', max: 59 },
  { field: 'inputSeconds', max: 59 },
];

/** CountdownEdit 组件入参 */
interface CountdownEditProps {
  /** 当前面板模式（倒计时/亮度/音量） */
  activePanel: TimePanelMode;
  /** 默认是否打开倒计时弹层（用于测试） */
  defaultOpen?: boolean;
}

/**
 * 倒计时弹出面板与系统工具组件
 * @description 倒计时编辑器不再常驻展示，通过 ToolButtons 中的计时器图标展开/收起浮层。
 * @param props - 当前面板模式与默认展开状态
 * @returns 倒计时与工具组件元素
 */
export function CountdownEdit({ activePanel, defaultOpen = false }: CountdownEditProps): ReactElement {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timerBtnRef = useRef<HTMLButtonElement>(null);

  const {
    timerState,
    isEditing,
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
  } = useCountdownEdit();

  const handleToggleCountdown = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !timerBtnRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="timer-container">
      <ToolButtons
        onToggleCountdown={handleToggleCountdown}
        isCountdownOpen={isOpen}
        timerBtnRef={timerBtnRef}
      />

      <div className="timer-tools-divider" />

      <div className="timer-main-shell">
        <div className={`timer-main${activePanel !== 'countdown' ? ' timer-main-hidden' : ''}`} />
        {activePanel === 'brightness' && <BrightnessControl />}
        {activePanel === 'volume' && <VolumeControl />}
      </div>

      {isOpen && (
        <div className="countdown-popover" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
          <div className="timer-title-row">
            <div className="timer-title">
              <span className="text-[10px] text-[var(--color-island-text)] leading-tight">{t('hover.timer.title', { defaultValue: '倒计时' })}</span>
            </div>
            <span className="text-[10px] text-[var(--color-island-text)] opacity-60 leading-tight ml-2">{t('hover.timer.editHint', { defaultValue: '滚动滚轮编辑时间' })}</span>
          </div>
          <div className="timer-main-row">
            {isEditing ? (
              <div className="timer-inputs" ref={timerInputsRef}>
                {TIMER_FIELDS.map(({ field, max }, index) => (
                  <Fragment key={field}>
                    {index > 0 && <span className="timer-sep">:</span>}
                    <input
                      type="text"
                      inputMode="numeric"
                      className="timer-input"
                      value={getFieldValue(field)}
                      onFocus={(e) => handleFieldFocus(field, e.target)}
                      onChange={(e) => handleInputChange(e.target.value, field)}
                      onBlur={() => handleFieldCommit(field, max)}
                      onKeyDown={(e) => { if (handleFieldKeyDown(e.key, field, max)) e.preventDefault(); }}
                      data-setter={field}
                      data-max={max}
                      maxLength={2}
                    />
                  </Fragment>
                ))}
              </div>
            ) : (
              <div className="timer-display">
                <span className="timer-value">{padZero(h)}</span>
                <span className="timer-sep">:</span>
                <span className="timer-value">{padZero(m)}</span>
                <span className="timer-sep">:</span>
                <span className="timer-value">{padZero(s)}</span>
              </div>
            )}

            <div className="timer-controls">
              {timerState === 'running' ? (
                <button
                  type="button"
                  className="timer-btn timer-btn-pause"
                  onClick={handlePause}
                  title={t('hover.timer.actions.pause', { defaultValue: '暂停' })}
                  aria-label={t('hover.timer.actions.pause', { defaultValue: '暂停' })}
                >
                  <img src={SvgIcon.PAUSE} alt={t('hover.timer.actions.pause', { defaultValue: '暂停' })} className="timer-btn-icon" />
                </button>
              ) : timerState === 'paused' ? (
                <button
                  type="button"
                  className="timer-btn timer-btn-start"
                  onClick={handleResume}
                  title={t('hover.timer.actions.resume', { defaultValue: '继续' })}
                  aria-label={t('hover.timer.actions.resume', { defaultValue: '继续' })}
                >
                  <img src={SvgIcon.CONTINUE} alt={t('hover.timer.actions.resume', { defaultValue: '继续' })} className="timer-btn-icon" />
                </button>
              ) : (
                <button
                  type="button"
                  className="timer-btn timer-btn-start"
                  onClick={handleStart}
                  title={t('hover.timer.actions.start', { defaultValue: '开始' })}
                  aria-label={t('hover.timer.actions.start', { defaultValue: '开始' })}
                >
                  <img src={SvgIcon.CONTINUE} alt={t('hover.timer.actions.start', { defaultValue: '开始' })} className="timer-btn-icon" />
                </button>
              )}
              <button
                type="button"
                className="timer-btn timer-btn-reset"
                onClick={handleReset}
                title={t('hover.timer.actions.reset', { defaultValue: '重置' })}
                aria-label={t('hover.timer.actions.reset', { defaultValue: '重置' })}
              >
                <img src={SvgIcon.REVERT} alt={t('hover.timer.actions.reset', { defaultValue: '重置' })} className="timer-btn-icon" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
