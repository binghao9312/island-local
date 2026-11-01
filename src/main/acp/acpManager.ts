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
 * @file acpManager.ts
 * @description 管理各供应商的 ACP 客户端实例，并把事件转发给渲染进程
 * @author 鸡哥
 */

import type {
  AcpEvent,
  AcpImageData,
  AcpProviderId,
  AcpProviderInfo,
  AcpPromptResult,
  AcpStartResult,
} from '../../shared/acpTypes';
import { AcpAgentClient, type AcpChildProcess, type AcpSpawnFn, type IAcpClient } from './acpAgentClient';
import { AgyAgentClient } from './agyAgentClient';
import { ACP_PROVIDER_SPECS, resolveCommand } from './providers';

/** 管理器构造参数 */
export interface AcpManagerOptions {
  /** 子进程工作目录（用户主目录） */
  cwd: string;
  /** 事件出口，通常是向主窗口发送 IPC */
  emit: (event: AcpEvent) => void;
  /** 应用版本 */
  clientVersion?: string;
  /** 测试时注入的子进程启动函数 */
  spawnFn?: AcpSpawnFn;
  /** 测试时注入的命令解析函数 */
  resolvePath?: (command: string) => string | null;
  /** 测试时注入的进程树查杀函数 */
  killFn?: (child: AcpChildProcess) => void;
  /** 空闲自动停止毫秒数，默认 10 分钟 */
  idleTimeoutMs?: number;
}

/** 每个供应商一个客户端，切换供应商不会终止另一个的会话 */
export class AcpManager {
  private readonly options: AcpManagerOptions;

  private readonly clients = new Map<AcpProviderId, IAcpClient>();

  /**
   * @param options - 管理器构造参数
   */
  constructor(options: AcpManagerOptions) {
    this.options = options;
  }

  /**
   * 列出所有供应商及其安装状态
   * @returns 供应商信息列表
   */
  listProviders(): AcpProviderInfo[] {
    const resolve = this.options.resolvePath ?? ((name: string) => resolveCommand(name));
    return Object.values(ACP_PROVIDER_SPECS).map((spec) => ({
      id: spec.id,
      label: spec.label,
      installed: resolve(spec.command) !== null,
      installHint: spec.installHint,
    }));
  }

  /**
   * 确保供应商的进程与会话可用
   * @param providerId - 供应商标识
   * @returns 启动结果
   */
  start(providerId: AcpProviderId): Promise<AcpStartResult> {
    return this.client(providerId).start();
  }

  /**
   * 向供应商发送一轮提问
   * @param providerId - 供应商标识
   * @param text - 用户文字
   * @param images - 用户附带的图片
   * @returns 该轮结果
   */
  prompt(providerId: AcpProviderId, text: string, images: AcpImageData[]): Promise<AcpPromptResult> {
    return this.client(providerId).prompt(text, images);
  }

  /**
   * 取消供应商当前一轮
   * @param providerId - 供应商标识
   */
  cancel(providerId: AcpProviderId): void {
    this.clients.get(providerId)?.cancel();
  }

  /**
   * 终止指定供应商的进程
   * @param providerId - 供应商标识
   */
  stop(providerId: AcpProviderId): void {
    this.clients.get(providerId)?.stop();
  }
  /**
   * 回复权限请求
   * @param requestId - 请求标识
   * @param optionId - 选中的选项，null 表示拒绝
   * @returns 是否有客户端认领了该请求
   */
  resolvePermission(requestId: string, optionId: string | null): boolean {
    for (const client of this.clients.values()) {
      if (client.resolvePermission(requestId, optionId)) return true;
    }
    return false;
  }

  /**
   * 终止并重新启动供应商进程，得到全新会话
   * @param providerId - 供应商标识
   * @returns 启动结果
   */
  async reset(providerId: AcpProviderId): Promise<AcpStartResult> {
    this.clients.get(providerId)?.stop();
    return this.client(providerId).start();
  }

  /** 终止所有子进程，应用退出时调用 */
  stopAll(): void {
    this.clients.forEach((client) => client.stop());
  }

  private client(providerId: AcpProviderId): IAcpClient {
    const existing = this.clients.get(providerId);
    if (existing) return existing;
    const clientOptions = {
      spec: ACP_PROVIDER_SPECS[providerId],
      cwd: this.options.cwd,
      emit: this.options.emit,
      clientVersion: this.options.clientVersion,
      spawnFn: this.options.spawnFn,
      resolvePath: this.options.resolvePath,
      killFn: this.options.killFn,
      idleTimeoutMs: this.options.idleTimeoutMs,
    };
    const created: IAcpClient =
      providerId === 'antigravity'
        ? new AgyAgentClient(clientOptions)
        : new AcpAgentClient(clientOptions);
    this.clients.set(providerId, created);
    return created;
  }
}
