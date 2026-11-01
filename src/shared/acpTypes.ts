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
 * @file acpTypes.ts
 * @description Agent Client Protocol（ACP）在主进程、预加载与渲染进程之间共用的类型定义
 * @author 鸡哥
 */

/** 支持的 ACP 智能体供应商标识 */
export type AcpProviderId = 'gemini' | 'omp';

/** 供应商静态描述，渲染进程用于切换器与未安装提示 */
export interface AcpProviderInfo {
  /** 供应商标识 */
  id: AcpProviderId;
  /** 展示名称 */
  label: string;
  /** 本机是否能找到对应命令行 */
  installed: boolean;
  /** 未安装时提示用户执行的安装命令 */
  installHint: string;
}

/** 与智能体进程的连接状态 */
export type AcpConnectionStatus = 'idle' | 'starting' | 'ready' | 'exited' | 'error' | 'not-installed';

/** 用户附带的图片（base64，不含 data: 前缀） */
export interface AcpImageData {
  /** base64 编码的图片内容 */
  data: string;
  /** 图片 MIME 类型，如 image/png */
  mimeType: string;
}

/** 工具调用状态 */
export type AcpToolStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** 计划条目 */
export interface AcpPlanEntry {
  /** 条目文字 */
  content: string;
  /** 条目状态 */
  status: string;
  /** 条目优先级 */
  priority?: string;
}

/** 权限请求选项 */
export interface AcpPermissionOption {
  /** 回复时使用的选项标识 */
  optionId: string;
  /** 展示名称 */
  name: string;
  /** 选项语义：allow_once / allow_always / reject_once / reject_always */
  kind: string;
}

/** 转发给渲染进程的权限请求 */
export interface AcpPermissionRequest {
  /** 主进程生成的请求标识，回复时回传 */
  requestId: string;
  /** 发起请求的供应商 */
  providerId: AcpProviderId;
  /** 请求涉及的工具调用标题 */
  title: string;
  /** 工具类型（execute、edit 等），可能缺失 */
  toolKind?: string;
  /** 可供选择的选项 */
  options: AcpPermissionOption[];
}

/** `session/update` 通知的 update 部分，字段随 sessionUpdate 类型变化 */
export interface AcpSessionUpdate {
  /** 更新类型，如 agent_message_chunk / tool_call */
  sessionUpdate: string;
  [key: string]: unknown;
}

/** 主进程推送给渲染进程的事件 */
export type AcpEvent =
  | { type: 'status'; providerId: AcpProviderId; status: AcpConnectionStatus; message?: string }
  | { type: 'update'; providerId: AcpProviderId; update: AcpSessionUpdate }
  | { type: 'permission'; request: AcpPermissionRequest }
  | { type: 'permission-cancelled'; providerId: AcpProviderId; requestId: string };

/** 启动或重置会话的结果 */
export interface AcpStartResult {
  /** 是否成功 */
  ok: boolean;
  /** 失败原因 */
  error?: string;
  /** 失败时的状态，用于区分未安装 */
  status?: AcpConnectionStatus;
}

/** 发送一轮提问的结果 */
export interface AcpPromptResult {
  /** 是否成功走完一轮（取消也算成功） */
  ok: boolean;
  /** 智能体给出的结束原因，如 end_turn / cancelled */
  stopReason?: string;
  /** 失败原因 */
  error?: string;
}

/** 渲染进程聊天条目 */
export type AcpChatItem =
  | { kind: 'user'; id: string; text: string; images: AcpImageData[] }
  | { kind: 'agent'; id: string; text: string; images: AcpImageData[] }
  | { kind: 'thought'; id: string; text: string }
  | { kind: 'tool'; id: string; toolCallId: string; title: string; status: AcpToolStatus; toolKind?: string; detail?: string }
  | { kind: 'plan'; id: string; entries: AcpPlanEntry[] }
  | { kind: 'error'; id: string; text: string };
