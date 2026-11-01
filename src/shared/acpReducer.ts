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
 * @file acpReducer.ts
 * @description 将 ACP `session/update` 通知归并为聊天条目列表的纯函数
 * @author 鸡哥
 */

import type { AcpChatItem, AcpImageData, AcpPlanEntry, AcpSessionUpdate, AcpToolStatus } from './acpTypes';

/** 工具调用详情的最大保留长度，避免大段输出撑爆界面 */
const TOOL_DETAIL_MAX = 600;

const TOOL_STATUSES: readonly string[] = ['pending', 'in_progress', 'completed', 'failed'];

/**
 * 按条目数量生成稳定且不重复的条目标识（条目只增不删，所以数量即序号）
 * @param items - 当前条目列表
 * @returns 新条目标识
 */
export function nextId(items: AcpChatItem[]): string {
  return `acp-${items.length}`;
}

/**
 * 判断值是否为普通对象
 * @param value - 待检查的值
 * @returns 是否为非空对象
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 归一化工具状态，未知值按进行中处理
 * @param value - 协议中的状态字符串
 * @param fallback - 状态缺失时的取值
 * @returns 规范化的工具状态
 */
function toToolStatus(value: unknown, fallback: AcpToolStatus): AcpToolStatus {
  return typeof value === 'string' && TOOL_STATUSES.includes(value) ? (value as AcpToolStatus) : fallback;
}

/**
 * 从 ACP 内容块提取纯文本
 * @param block - ACP ContentBlock
 * @returns 文本，非文本块返回空串
 */
export function contentBlockText(block: unknown): string {
  if (!isRecord(block)) return '';
  if (block.type === 'text' && typeof block.text === 'string') return block.text;
  if (block.type === 'resource_link' && typeof block.uri === 'string') return block.uri;
  return '';
}

/**
 * 从 ACP 内容块提取图片
 * @param block - ACP ContentBlock
 * @returns 图片数据，非图片块返回 null
 */
function contentBlockImage(block: unknown): AcpImageData | null {
  if (!isRecord(block) || block.type !== 'image') return null;
  if (typeof block.data !== 'string' || typeof block.mimeType !== 'string') return null;
  return { data: block.data, mimeType: block.mimeType };
}

/**
 * 从工具调用的 content 数组提炼一段简短详情
 * @param content - ToolCallContent 数组
 * @returns 详情文本，没有可展示内容时返回 undefined
 */
function toolDetail(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  for (const entry of content) {
    if (!isRecord(entry)) continue;
    if (entry.type === 'content') {
      const text = contentBlockText(entry.content);
      if (text) parts.push(text);
    } else if (entry.type === 'diff' && typeof entry.path === 'string') {
      parts.push(entry.path);
    }
  }
  if (parts.length === 0) return undefined;
  const joined = parts.join('\n');
  return joined.length > TOOL_DETAIL_MAX ? `${joined.slice(0, TOOL_DETAIL_MAX)}…` : joined;
}

/**
 * 追加或合并流式文本块
 * @description 连续同类型的块合并到同一条目，被其他条目隔开后新开一条
 * @param items - 当前条目列表
 * @param kind - 目标条目类型
 * @param content - ACP ContentBlock
 * @returns 新的条目列表
 */
function appendChunk(items: AcpChatItem[], kind: 'agent' | 'thought', content: unknown): AcpChatItem[] {
  const text = contentBlockText(content);
  const image = kind === 'agent' ? contentBlockImage(content) : null;
  if (!text && !image) return items;
  const last = items[items.length - 1];
  if (last && last.kind === kind) {
    if (last.kind === 'agent') {
      return [...items.slice(0, -1), {
        ...last,
        text: last.text + text,
        images: image ? [...last.images, image] : last.images,
      }];
    }
    if (last.kind === 'thought') {
      return [...items.slice(0, -1), { ...last, text: last.text + text }];
    }
  }
  if (kind === 'agent') {
    return [...items, { kind: 'agent', id: nextId(items), text, images: image ? [image] : [] }];
  }
  return [...items, { kind: 'thought', id: nextId(items), text }];
}

/**
 * 新增或更新工具调用条目
 * @param items - 当前条目列表
 * @param update - tool_call / tool_call_update 通知
 * @returns 新的条目列表
 */
function upsertTool(items: AcpChatItem[], update: AcpSessionUpdate): AcpChatItem[] {
  const toolCallId = typeof update.toolCallId === 'string' ? update.toolCallId : '';
  if (!toolCallId) return items;
  const index = items.findIndex((item) => item.kind === 'tool' && item.toolCallId === toolCallId);
  const title = typeof update.title === 'string' ? update.title : undefined;
  const toolKind = typeof update.kind === 'string' ? update.kind : undefined;
  const detail = toolDetail(update.content);
  if (index >= 0) {
    const existing = items[index];
    if (existing.kind !== 'tool') return items;
    const merged: AcpChatItem = {
      ...existing,
      title: title ?? existing.title,
      status: toToolStatus(update.status, existing.status),
      toolKind: toolKind ?? existing.toolKind,
      detail: detail ?? existing.detail,
    };
    return items.map((item, i) => (i === index ? merged : item));
  }
  return [...items, {
    kind: 'tool',
    id: nextId(items),
    toolCallId,
    title: title ?? toolCallId,
    status: toToolStatus(update.status, 'pending'),
    toolKind,
    detail,
  }];
}

/**
 * 用最新计划整体替换已有计划条目
 * @param items - 当前条目列表
 * @param update - plan 通知
 * @returns 新的条目列表
 */
function replacePlan(items: AcpChatItem[], update: AcpSessionUpdate): AcpChatItem[] {
  if (!Array.isArray(update.entries)) return items;
  const entries: AcpPlanEntry[] = update.entries.filter(isRecord).map((entry) => ({
    content: typeof entry.content === 'string' ? entry.content : '',
    status: typeof entry.status === 'string' ? entry.status : 'pending',
    priority: typeof entry.priority === 'string' ? entry.priority : undefined,
  }));
  const index = items.findIndex((item) => item.kind === 'plan');
  if (index >= 0) {
    return items.map((item, i) => (i === index ? { kind: 'plan', id: item.id, entries } : item));
  }
  return [...items, { kind: 'plan', id: nextId(items), entries }];
}

/**
 * 将一条 `session/update` 归并进聊天条目列表
 * @description 不修改入参；未识别的更新类型（用量、命令列表等）原样忽略
 * @param items - 当前条目列表
 * @param update - 通知中的 update 对象
 * @returns 新的条目列表，无变化时返回原数组
 */
export function reduceAcpUpdate(items: AcpChatItem[], update: AcpSessionUpdate): AcpChatItem[] {
  switch (update.sessionUpdate) {
    case 'agent_message_chunk':
      return appendChunk(items, 'agent', update.content);
    case 'agent_thought_chunk':
      return appendChunk(items, 'thought', update.content);
    case 'tool_call':
    case 'tool_call_update':
      return upsertTool(items, update);
    case 'plan':
      return replacePlan(items, update);
    default:
      return items;
  }
}
