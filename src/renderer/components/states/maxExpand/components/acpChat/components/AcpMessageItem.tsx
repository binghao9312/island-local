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
 * @file AcpMessageItem.tsx
 * @description ACP 聊天条目渲染：用户/助手气泡、思考、工具调用状态行、计划与错误
 * @author 鸡哥
 */

import { memo } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpChatItem, AcpImageData, AcpToolStatus } from '../../../../../../../shared/acpTypes';
import { AssistantMarkdown } from './AssistantMarkdown';

/** 工具状态对应的前缀符号 */
const TOOL_STATUS_MARK: Record<AcpToolStatus, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '✓',
  failed: '✗',
};

/** 工具状态对应的文字颜色 */
const TOOL_STATUS_COLOR: Record<AcpToolStatus, string> = {
  pending: 'text-[rgba(var(--color-text-rgb),0.4)]',
  in_progress: 'text-amber-400 animate-pulse',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
};

interface AcpImageStripProps {
  /** 要展示的图片 */
  images: AcpImageData[];
}

/**
 * 一行图片缩略图
 * @param props - 组件属性
 * @param props.images - 要展示的图片
 * @returns 图片行，没有图片时为空
 */
function AcpImageStrip({ images }: AcpImageStripProps): ReactElement | null {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {images.map((image) => (
        <img
          key={`${image.mimeType}-${image.data.length}-${image.data.slice(0, 32)}`}
          className="max-h-48 max-w-full rounded-lg object-contain"
          src={`data:${image.mimeType};base64,${image.data}`}
          alt=""
        />
      ))}
    </div>
  );
}

interface AcpMessageItemProps {
  /** 要渲染的条目 */
  item: AcpChatItem;
}

/**
 * 渲染单个聊天条目
 * @param props - 组件属性
 * @param props.item - 要渲染的条目
 * @returns 条目元素
 */
export const AcpMessageItem = memo(function AcpMessageItem({ item }: AcpMessageItemProps): ReactElement | null {
  const { t } = useTranslation();

  if (item.kind === 'user') {
    return (
      <div className="flex max-w-[88%] flex-col items-end gap-1.5 self-end">
        <AcpImageStrip images={item.images} />
        {item.text && <div className="max-expand-chat-bubble user whitespace-pre-wrap">{item.text}</div>}
      </div>
    );
  }

  if (item.kind === 'agent') {
    return (
      <div className="max-expand-chat-bubble ai r1pxc-chat flex flex-col gap-1.5">
        {item.text && <AssistantMarkdown content={item.text} />}
        <AcpImageStrip images={item.images} />
      </div>
    );
  }

  if (item.kind === 'thought') {
    return (
      <details className="max-w-[88%] self-start text-xs text-[rgba(var(--color-text-rgb),0.5)]">
        <summary className="cursor-pointer select-none">{t('acpChat.thought')}</summary>
        <div className="mt-1 whitespace-pre-wrap">{item.text}</div>
      </details>
    );
  }

  if (item.kind === 'tool') {
    const label = (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={TOOL_STATUS_COLOR[item.status]} aria-label={t(`acpChat.tool.${item.status}`)}>
          {TOOL_STATUS_MARK[item.status]}
        </span>
        <span className="truncate">{item.title}</span>
      </span>
    );
    return (
      <div className="max-w-[88%] self-start text-xs text-[rgba(var(--color-text-rgb),0.6)]">
        {item.detail ? (
          <details>
            <summary className="cursor-pointer select-none">{label}</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-[rgba(var(--color-text-rgb),0.06)] p-2 text-[11px]">
              {item.detail}
            </pre>
          </details>
        ) : label}
      </div>
    );
  }

  if (item.kind === 'plan') {
    return (
      <div className="max-w-[88%] self-start rounded-lg bg-[rgba(var(--color-text-rgb),0.05)] px-3 py-2 text-xs text-[rgba(var(--color-text-rgb),0.7)]">
        <div className="mb-1 font-semibold">{t('acpChat.plan')}</div>
        <ul className="flex flex-col gap-0.5">
          {item.entries.map((entry) => (
            <li key={`${entry.content}-${entry.status}`} className="flex gap-1.5">
              <span>{entry.status === 'completed' ? '✓' : entry.status === 'in_progress' ? '◐' : '○'}</span>
              <span className={entry.status === 'completed' ? 'line-through opacity-60' : ''}>{entry.content}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className="max-w-[88%] self-start whitespace-pre-wrap rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300"
      role="alert"
    >
      {item.text}
    </div>
  );
});
