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
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const last = items[items.length - 1];
  // 流式追加文字不改变条目数量，用末条内容长度触发滚动
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
      {busy && <span className="size-2 animate-pulse self-start rounded-full bg-[rgba(var(--color-text-rgb),0.5)]" role="status" />}
    </div>
  );
}
