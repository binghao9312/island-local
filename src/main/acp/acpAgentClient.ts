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
 * @file acpAgentClient.ts
 * @description 单个 ACP 智能体进程的客户端：握手、会话、提问、取消与权限往返
 * @author 鸡哥
 */

import { execSync, spawn } from 'node:child_process';
import type {
  AcpConnectionStatus,
  AcpEvent,
  AcpImageData,
  AcpPermissionOption,
  AcpPromptResult,
  AcpSessionUpdate,
  AcpStartResult,
} from '../../shared/acpTypes';
import { JsonRpcConnection } from './jsonRpc';
import type { JsonRpcInput } from './jsonRpc';
import { JsonRpcError } from './jsonRpcError';
import { buildSpawnPlan, resolveCommand } from './providers';
import type { AcpProviderSpec, SpawnPlan } from './providers';

/** 本客户端实现的 ACP 协议版本 */
const ACP_PROTOCOL_VERSION = 1;

/** 握手（initialize + session/new）的最长等待时间 */
const HANDSHAKE_TIMEOUT_MS = 90_000;

/** 默认空闲自动停止时间：10 分钟无提问且无活动自动退出进程 */
export const ACP_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/** 仅保留 stderr 末尾这么多字符，用于进程异常退出时给出线索 */
const STDERR_TAIL_MAX = 2000;

/** 子进程的最小接口，真实实现是 ChildProcess，测试中可以用假对象替代 */
export interface AcpChildProcess {
  pid?: number;
  stdin: { write(chunk: string): unknown };
  stdout: JsonRpcInput;
  stderr: { on(event: 'data', listener: (chunk: Buffer | string) => void): unknown } | null;
  on(event: 'exit', listener: (code: number | null, signal: string | null) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  kill(signal?: string): unknown;
}

/**
 * 终止子进程及其整棵派生进程树。
 * Windows 下直接对包装了 cmd.exe 的 .cmd 垫片调用 child.kill() 只会终止 cmd.exe，
 * 内部真正的 node/agent 进程会变成孤儿进程滞留；因此优先调用 taskkill /PID <pid> /T /F。
 * @param child - 子进程对象
 */
export function defaultKillProcessTree(child: AcpChildProcess): void {
  if (process.platform === 'win32' && typeof child.pid === 'number' && child.pid > 0) {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { windowsHide: true, stdio: 'ignore' });
      return;
    } catch {
      // taskkill 失败（如进程已退出）后回退至原生 kill()
    }
  }
  try {
    child.kill();
  } catch {
    // 忽略已被终止的异常
  }
}

/** 启动子进程的函数 */
export type AcpSpawnFn = (plan: SpawnPlan, cwd: string) => AcpChildProcess;

/** 客户端构造参数 */
export interface AcpAgentClientOptions {
  /** 供应商规格 */
  spec: AcpProviderSpec;
  /** 子进程工作目录（用户主目录） */
  cwd: string;
  /** 事件出口，通常转发给渲染进程 */
  emit: (event: AcpEvent) => void;
  /** 应用版本，写入 clientInfo */
  clientVersion?: string;
  /** 启动子进程的函数，默认使用 child_process.spawn 且隐藏窗口 */
  spawnFn?: AcpSpawnFn;
  /** 命令解析函数，返回完整路径或 null，默认在 PATH 中查找 */
  resolvePath?: (command: string) => string | null;
  /** 终止子进程树的函数，默认使用 taskkill (Win32) 回退到 kill() */
  killFn?: (child: AcpChildProcess) => void;
  /** 空闲自动停止毫秒数，默认 10 分钟 (10 * 60 * 1000) */
  idleTimeoutMs?: number;
}

/**
 * 默认的子进程启动函数：隐藏 Windows 控制台窗口，stdio 全部走管道
 * @param plan - 启动计划
 * @param cwd - 工作目录
 * @returns 子进程
 */
function defaultSpawn(plan: SpawnPlan, cwd: string): AcpChildProcess {
  const child = spawn(plan.command, plan.args, {
    cwd,
    windowsHide: true,
    windowsVerbatimArguments: plan.windowsVerbatimArguments,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  // 进程先退出时写 stdin 会触发 EPIPE；退出本身由 exit 事件处理，这里避免未捕获异常
  child.stdin.on('error', () => {});
  return child as unknown as AcpChildProcess;
}

/**
 * 为 Promise 加超时
 * @param promise - 原 Promise
 * @param ms - 超时毫秒数
 * @param message - 超时错误信息
 * @returns 带超时的 Promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/**
 * 将未知异常转为可展示的文本
 * @param error - 捕获到的异常
 * @returns 错误文本
 */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 单个供应商的 ACP 客户端 */
export class AcpAgentClient {
  private readonly options: AcpAgentClientOptions;

  private child: AcpChildProcess | null = null;

  private connection: JsonRpcConnection | null = null;

  private sessionId = '';

  private currentStatus: AcpConnectionStatus = 'idle';

  private starting: Promise<AcpStartResult> | null = null;

  private stderrTail = '';

  private permissionSeq = 0;

  private readonly permissions = new Map<string, (optionId: string | null) => void>();

  private idleTimer: NodeJS.Timeout | null = null;

  private promptInFlight = false;
  /**
   * @param options - 客户端构造参数
   */
  constructor(options: AcpAgentClientOptions) {
    this.options = options;
  }

  /** 当前连接状态 */
  get status(): AcpConnectionStatus {
    return this.currentStatus;
  }

  /**
   * 确保进程已启动且会话可用；重复调用共享同一次启动
   * @returns 启动结果
   */
  start(): Promise<AcpStartResult> {
    if (this.currentStatus === 'ready') return Promise.resolve({ ok: true });
    if (this.starting) return this.starting;
    const attempt = this.doStart().finally(() => {
      this.starting = null;
    });
    this.starting = attempt;
    return attempt;
  }

  /**
   * 发送一轮提问，等待智能体结束该轮
   * @param text - 用户文字
   * @param images - 用户附带的图片
   * @returns 结束原因或失败信息
   */
  async prompt(text: string, images: AcpImageData[] = []): Promise<AcpPromptResult> {
    this.promptInFlight = true;
    this.clearIdleTimer();
    const started = await this.start();
    if (!started.ok || !this.connection) {
      this.promptInFlight = false;
      this.resetIdleTimer();
      return { ok: false, error: started.error };
    }
    const blocks: Array<Record<string, unknown>> = images.map((image) => ({
      type: 'image',
      data: image.data,
      mimeType: image.mimeType,
    }));
    if (text) blocks.push({ type: 'text', text });
    try {
      const result = await this.connection.request<{ stopReason?: string }>('session/prompt', {
        sessionId: this.sessionId,
        prompt: blocks,
      });
      return { ok: true, stopReason: result?.stopReason ?? 'end_turn' };
    } catch (error) {
      return { ok: false, error: errorText(error) };
    } finally {
      this.promptInFlight = false;
      this.resetIdleTimer();
    }
  }

  /** 取消当前一轮：通知智能体，并把所有待处理的权限请求按"已取消"回复 */
  cancel(): void {
    if (this.connection && this.sessionId) {
      this.connection.notify('session/cancel', { sessionId: this.sessionId });
    }
    this.cancelPermissions();
  }

  /**
   * 回复一条权限请求
   * @param requestId - 请求标识
   * @param optionId - 用户选择的选项，null 表示拒绝/取消
   * @returns 该请求是否属于本客户端且仍在等待
   */
  resolvePermission(requestId: string, optionId: string | null): boolean {
    const settle = this.permissions.get(requestId);
    if (!settle) return false;
    this.permissions.delete(requestId);
    settle(optionId);
    return true;
  }

  /** 终止进程并回到空闲状态 */
  stop(): void {
    this.clearIdleTimer();
    this.promptInFlight = false;
    const child = this.child;
    this.teardown(new Error('Agent stopped'));
    this.setStatus('idle');
    if (child) {
      (this.options.killFn ?? defaultKillProcessTree)(child);
    }
  }

  private setStatus(status: AcpConnectionStatus, message?: string): void {
    this.currentStatus = status;
    this.options.emit({ type: 'status', providerId: this.options.spec.id, status, message });
  }

  private async doStart(): Promise<AcpStartResult> {
    const { spec } = this.options;
    const resolve = this.options.resolvePath ?? ((name: string) => resolveCommand(name));
    const found = resolve(spec.command);
    if (!found) {
      this.setStatus('not-installed', spec.installHint);
      return { ok: false, status: 'not-installed', error: spec.installHint };
    }
    this.setStatus('starting');
    try {
      const plan = buildSpawnPlan(found, spec.args);
      const child = (this.options.spawnFn ?? defaultSpawn)(plan, this.options.cwd);
      this.attach(child);
      await withTimeout(this.handshake(), HANDSHAKE_TIMEOUT_MS, 'ACP handshake timed out');
      this.setStatus('ready');
      this.resetIdleTimer();
      return { ok: true };
    } catch (error) {
      this.clearIdleTimer();
      this.promptInFlight = false;
      const message = this.withStderr(errorText(error));
      const child = this.child;
      this.teardown(new Error(message));
      if (child) {
        (this.options.killFn ?? defaultKillProcessTree)(child);
      }
      this.setStatus('error', message);
      return { ok: false, status: 'error', error: message };
    }
  }

  private async handshake(): Promise<void> {
    const connection = this.connection;
    if (!connection) throw new Error('Not connected');
    await connection.request('initialize', {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: 'eIsland', title: 'eIsland', version: this.options.clientVersion ?? '0.0.0' },
    });
    const created = await connection.request<{ sessionId?: string }>('session/new', {
      cwd: this.options.cwd,
      mcpServers: [],
    });
    if (!created?.sessionId) throw new Error('Agent did not return a session id');
    this.sessionId = created.sessionId;
  }

  private attach(child: AcpChildProcess): void {
    this.child = child;
    this.stderrTail = '';
    this.connection = new JsonRpcConnection(child.stdout, child.stdin, {
      onRequest: (method, params) => this.handleRequest(method, params),
      onNotification: (method, params) => this.handleNotification(method, params),
    });
    child.stderr?.on('data', (chunk) => {
      this.stderrTail = (this.stderrTail + String(chunk)).slice(-STDERR_TAIL_MAX);
    });
    child.on('error', (error) => this.handleExit(child, error.message));
    child.on('exit', (code, signal) => this.handleExit(child, `Process exited (${code ?? signal ?? 'unknown'})`));
  }

  private handleExit(child: AcpChildProcess, reason: string): void {
    // 已被 teardown 替换或重复触发（error 之后又 exit）时忽略
    if (this.child !== child) return;
    this.clearIdleTimer();
    this.promptInFlight = false;
    const message = this.withStderr(reason);
    this.teardown(new Error(message));
    this.setStatus('exited', message);
  }

  /** 重置空闲自动停止计时器 */
  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (this.currentStatus !== 'ready' || this.promptInFlight) return;
    const timeoutMs = this.options.idleTimeoutMs ?? ACP_IDLE_TIMEOUT_MS;
    if (timeoutMs <= 0) return;
    this.idleTimer = setTimeout(() => {
      if (!this.promptInFlight && this.currentStatus === 'ready') {
        this.stop();
      }
    }, timeoutMs);
  }

  /** 清除空闲计时器 */
  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /** 收到活动时重置空闲计时 */
  private touchActivity(): void {
    if (!this.promptInFlight) {
      this.resetIdleTimer();
    }
  }

  private withStderr(message: string): string {
    const tail = this.stderrTail.trim();
    return tail ? `${message}\n${tail}` : message;
  }

  private teardown(reason: Error): void {
    this.connection?.close(reason);
    this.connection = null;
    this.child = null;
    this.sessionId = '';
    this.cancelPermissions();
  }

  private cancelPermissions(): void {
    const waiting = [...this.permissions.entries()];
    this.permissions.clear();
    waiting.forEach(([requestId, settle]) => {
      settle(null);
      this.options.emit({ type: 'permission-cancelled', providerId: this.options.spec.id, requestId });
    });
  }

  private handleNotification(method: string, params: unknown): void {
    this.touchActivity();
    if (method !== 'session/update') return;
    const update = (params as { update?: AcpSessionUpdate } | null)?.update;
    if (update && typeof update.sessionUpdate === 'string') {
      this.options.emit({ type: 'update', providerId: this.options.spec.id, update });
    }
  }

  private async handleRequest(method: string, params: unknown): Promise<unknown> {
    this.touchActivity();
    if (method !== 'session/request_permission') {
      throw new JsonRpcError(-32601, `Method not found: ${method}`);
    }
    const body = params as {
      toolCall?: { title?: string; kind?: string };
      options?: AcpPermissionOption[];
    } | null;
    const options = Array.isArray(body?.options)
      ? body.options.filter((option) => typeof option?.optionId === 'string')
      : [];
    const requestId = `${this.options.spec.id}-perm-${++this.permissionSeq}`;
    const optionId = await new Promise<string | null>((resolve) => {
      this.permissions.set(requestId, resolve);
      this.options.emit({
        type: 'permission',
        request: {
          requestId,
          providerId: this.options.spec.id,
          title: body?.toolCall?.title ?? '',
          toolKind: body?.toolCall?.kind,
          options,
        },
      });
    });
    return optionId === null
      ? { outcome: { outcome: 'cancelled' } }
      : { outcome: { outcome: 'selected', optionId } };
  }
}
