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
 * @file AcpMessageList.tsx
 * @description ACP 聊天消息列表：自动滚动到底部，用户上滚阅读历史时不打断
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactElement, ReactNode } from 'react';
import type { AcpChatItem } from '../../../../../../../shared/acpTypes';
import { AcpMessageItem } from './AcpMessageItem';
/** 距离底部多少像素以内仍视为"贴底" */
const STICK_THRESHOLD_PX = 48;

interface AcpMessageListProps {
  /** 要展示的条目 */
  items: AcpChatItem[];
  /** 一轮提问进行中，用于在末尾显示等待提示 */
  busy: boolean;
  /** 没有条目时展示的内容 */
  emptyContent: ReactNode;
}

/**
 * 消息列表
 * @param props - 组件属性
 * @param props.items - 要展示的条目
 * @param props.busy - 一轮提问是否进行中
 * @param props.emptyContent - 没有条目时展示的内容
 * @returns 可滚动的消息列表元素
 */
export function AcpMessageList({ items, busy, emptyContent }: AcpMessageListProps): ReactElement {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const last = items[items.length - 1];
  const isWaitingFirstChunk = busy && (!last || last.kind !== 'agent' || last.text === '');
  const lastSize = last && (last.kind === 'agent' || last.kind === 'thought') ? last.text.length : 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [items.length, lastSize, busy]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      onScroll={(event) => {
        const el = event.currentTarget;
        stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
      }}
      onWheelCapture={(event) => { event.stopPropagation(); }}
    >
      {items.length === 0 ? emptyContent : items.map((item) => <AcpMessageItem key={item.id} item={item} />)}
      {isWaitingFirstChunk && (
        <div
          className="max-expand-chat-bubble ai r1pxc-chat flex items-center gap-1.5 self-start px-3 py-2"
          role="status"
          aria-label={t('acpChat.thinking', { defaultValue: '思考中…' })}
        >
          <span className="size-1.5 rounded-full bg-[rgba(var(--color-text-rgb),0.6)] animate-bounce [animation-delay:-0.3s]" />
          <span className="size-1.5 rounded-full bg-[rgba(var(--color-text-rgb),0.6)] animate-bounce [animation-delay:-0.15s]" />
          <span className="size-1.5 rounded-full bg-[rgba(var(--color-text-rgb),0.6)] animate-bounce" />
        </div>
      )}
    </div>
  );
}
