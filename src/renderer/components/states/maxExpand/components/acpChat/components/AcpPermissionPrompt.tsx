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
 * @file AcpPermissionPrompt.tsx
 * @description ACP 权限请求面板：展示工具调用并按智能体给出的选项渲染按钮
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpPermissionRequest } from '../../../../../../../shared/acpTypes';

interface AcpPermissionPromptProps {
  /** 待处理的权限请求 */
  request: AcpPermissionRequest;
  /** 还有多少条请求在排队（不含当前） */
  queued: number;
  /** 用户做出选择；optionId 为 null 表示拒绝 */
  onResolve: (optionId: string | null) => void;
}

/**
 * 按选项语义返回按钮样式
 * @param kind - 选项语义（allow_once / allow_always / reject_once / reject_always）
 * @returns Tailwind 类名
 */
function optionClass(kind: string): string {
  if (kind.startsWith('reject')) return 'bg-red-500/20 text-red-300 hover:bg-red-500/30';
  if (kind === 'allow_always') return 'bg-[rgba(var(--color-text-rgb),0.12)] hover:bg-[rgba(var(--color-text-rgb),0.2)]';
  return 'bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35';
}

/**
 * 权限请求面板
 * @param props - 组件属性
 * @param props.request - 待处理的权限请求
 * @param props.queued - 排队中的请求数量
 * @param props.onResolve - 用户选择后的回调
 * @returns 面板元素
 */
export function AcpPermissionPrompt({ request, queued, onResolve }: AcpPermissionPromptProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div
      className="mx-4 mb-2 flex flex-col gap-2 rounded-xl border border-[rgba(var(--color-text-rgb),0.12)] bg-[rgba(var(--color-text-rgb),0.06)] p-3"
      role="alertdialog"
      aria-label={t('acpChat.permission.title')}
      onWheelCapture={(event) => { event.stopPropagation(); }}
    >
      <div className="text-xs font-semibold text-[rgba(var(--color-text-rgb),0.85)]">
        {t('acpChat.permission.title')}
        {queued > 0 && (
          <span className="ml-2 font-normal text-[rgba(var(--color-text-rgb),0.45)]">
            {t('acpChat.permission.queued', { count: queued })}
          </span>
        )}
      </div>
      {request.title && (
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[rgba(var(--color-text-rgb),0.06)] p-2 text-xs text-[rgba(var(--color-text-rgb),0.8)]">
          {request.title}
        </pre>
      )}
      <div className="flex flex-wrap gap-2">
        {request.options.map((option) => (
          <button
            key={option.optionId}
            type="button"
            className={`rounded-lg px-3 py-1 text-xs transition-colors ${optionClass(option.kind)}`}
            onClick={() => onResolve(option.optionId)}
          >
            {option.name}
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg px-3 py-1 text-xs text-[rgba(var(--color-text-rgb),0.5)] hover:text-[rgba(var(--color-text-rgb),0.8)]"
          onClick={() => onResolve(null)}
        >
          {t('acpChat.permission.cancel')}
        </button>
      </div>
    </div>
  );
}
