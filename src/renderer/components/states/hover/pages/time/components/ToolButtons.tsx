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
 * @file ToolButtons.tsx
 * @description 倒计时开关、番茄钟开关和任务管理器工具按钮组件
 * @author 鸡哥
 */

import { type ReactElement, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import { togglePomodoro } from '../../../../../../components/states/expand/pages/OverviewTab/components/widgets/PomodoroWidget';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { useToolButtons } from '../hooks/useToolButtons';
import { padZero } from '../utils/timerUtils';

/** ToolButtons 组件入参 */
export interface ToolButtonsProps {
  /** 倒计时面板打开/关闭切换回调 */
  onToggleCountdown?: () => void;
  /** 倒计时面板是否处于展开状态 */
  isCountdownOpen?: boolean;
  /** 倒计时按钮的 DOM 引用，用于点击外部时排除按钮本身 */
  timerBtnRef?: Ref<HTMLButtonElement>;
}

/**
 * 工具按钮组件
 * @description 提供倒计时开关、番茄钟开始/暂停和打开任务管理器三个功能按钮。
 * 当倒计时正在运行或暂停时，倒计时按钮展示剩余 mm:ss 文本。
 * @param props - 组件属性
 * @returns 工具按钮元素
 */
export function ToolButtons({
  onToggleCountdown,
  isCountdownOpen = false,
  timerBtnRef,
}: ToolButtonsProps = {}): ReactElement {
  const { t } = useTranslation();
  const { handleTaskManager } = useToolButtons();
  const timerData = useIslandStore((state) => state.timerData);
  const pomodoroRunning = useIslandStore((state) => state.pomodoroRunning);

  const isTimerActive = timerData?.state === 'running' || timerData?.state === 'paused';
  const remainingSec = timerData?.remainingSeconds ?? 0;
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const timeBadge = `${padZero(m)}:${padZero(s)}`;

  return (
    <div className="timer-tools">
      <button
        ref={timerBtnRef}
        type="button"
        className={`action-btn timer-toggle-btn${isTimerActive ? ' is-active' : ''}${isCountdownOpen ? ' is-open' : ''}`}
        onClick={onToggleCountdown}
        title={t('hover.tools.timer', { defaultValue: '倒计时' })}
        aria-label={t('hover.tools.timer', { defaultValue: '倒计时' })}
        aria-pressed={isCountdownOpen}
      >
        {isTimerActive ? (
          <span className="timer-btn-badge">{timeBadge}</span>
        ) : (
          <img
            src={SvgIcon.TIMER}
            alt={t('hover.tools.timer', { defaultValue: '倒计时' })}
            className="action-btn-icon"
          />
        )}
      </button>
      <button
        type="button"
        className={`action-btn pomodoro-toggle-btn${pomodoroRunning ? ' is-active' : ''}`}
        onClick={() => { void togglePomodoro(); }}
        title={t('hover.tools.pomodoro', { defaultValue: '番茄钟' })}
        aria-label={t('hover.tools.pomodoro', { defaultValue: '番茄钟' })}
        aria-pressed={pomodoroRunning}
      >
        <img
          src={SvgIcon.POMODORO}
          alt={t('hover.tools.pomodoro', { defaultValue: '番茄钟' })}
          className="action-btn-icon"
        />
      </button>
      <button
        type="button"
        className="action-btn"
        onClick={handleTaskManager}
        title={t('hover.tools.taskManager', { defaultValue: '任务管理器' })}
        aria-label={t('hover.tools.taskManager', { defaultValue: '任务管理器' })}
      >
        <img
          src={SvgIcon.TASK_MANAGER}
          alt={t('hover.tools.taskManager', { defaultValue: '任务管理器' })}
          className="action-btn-icon"
        />
      </button>
    </div>
  );
}
