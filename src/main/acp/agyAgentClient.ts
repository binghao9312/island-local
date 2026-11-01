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
 * @file agyAgentClient.ts
 * @description Antigravity（agy CLI）适配器：在无原生 ACP 模式下通过 stream-json 协议
 * 运行长进程并把 step_update/result 事件映射为渲染进程的聊天更新模型（文字块、思考与工具调用）
 * @author 鸡哥
 */

import { StringDecoder } from 'node:string_decoder';
import type {
  AcpConnectionStatus,
  AcpImageData,
  AcpPromptResult,
  AcpStartResult,
  AcpToolStatus,
} from '../../shared/acpTypes';
import {
  ACP_IDLE_TIMEOUT_MS,
  defaultKillProcessTree,
  type AcpAgentClientOptions,
  type AcpChildProcess,
  type IAcpClient,
} from './acpAgentClient';
import { buildSpawnPlan, resolveCommand, type SpawnPlan } from './providers';
import { spawn } from 'node:child_process';

/** 握手/启动等待的最长等待时间（毫秒） */
const START_TIMEOUT_MS = 60_000;

/** 仅保留 stderr 末尾字符数 */
const STDERR_TAIL_MAX = 2000;

/** agy step_update 里的 tool_info 结构 */
interface AgyToolInfo {
  name?: string;
  parameters?: Record<string, unknown>;
  output?: string;
  error?: { message?: string };
}

/** agy step_update 事件 payload */
interface AgyStepUpdate {
  conversation_id?: string;
  step_index?: number;
  state?: 'ACTIVE' | 'DONE' | 'ERROR';
  step_type?: string;
  text_delta?: string;
  thinking_delta?: string;
  thinking?: string;
  tool_name?: string;
  tool_info?: AgyToolInfo;
}

/** agy result 事件 payload */
interface AgyResult {
  status?: 'SUCCESS' | 'ERROR';
  response?: string;
  error?: string;
}

/**
 * 默认子进程启动函数
 * @param plan - 启动描述
 * @param cwd - 工作目录
 * @returns 派生的子进程对象
 */
function defaultSpawn(plan: SpawnPlan, cwd: string): AcpChildProcess {
  const child = spawn(plan.command, plan.args, {
    cwd,
    windowsHide: true,
    windowsVerbatimArguments: plan.windowsVerbatimArguments,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.on('error', () => {});
  return child as unknown as AcpChildProcess;
}

/**
 * 将异常转为可展示的错误字符串
 * @param error - 异常对象
 * @returns 错误字符串
 */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Antigravity CLI 适配客户端
 * @description 单会话长进程运行 `agy -p --input-format stream-json --output-format stream-json`，
 * 映射 stdin/stdout 为与 ACP 相同的渲染事件模型。
 */
export class AgyAgentClient implements IAcpClient {
  private readonly options: AcpAgentClientOptions;

  private child: AcpChildProcess | null = null;

  private currentStatus: AcpConnectionStatus = 'idle';

  private starting: Promise<AcpStartResult> | null = null;

  private stderrTail = '';

  private idleTimer: NodeJS.Timeout | null = null;

  private promptInFlight = false;

  private activePromptResolver: ((result: AcpPromptResult) => void) | null = null;

  private startResolver: ((result: AcpStartResult) => void) | null = null;

  /**
   * @param options - 客户端配置
   */
  constructor(options: AcpAgentClientOptions) {
    this.options = options;
  }

  /** 当前连接状态 */
  get status(): AcpConnectionStatus {
    return this.currentStatus;
  }

  /**
   * 确保长进程已启动并就绪；重复调用共享同一启动 Promise
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
   * 发送一轮提问，等待 agy 产生 terminal result
   * @param text - 用户输入文本
   * @param _images - 图片参数（agy stream-json 暂不支持图片块，故忽略）
   * @returns 结束原因或失败原因
   */
  async prompt(text: string, _images: AcpImageData[] = []): Promise<AcpPromptResult> {
    this.promptInFlight = true;
    this.clearIdleTimer();
    if (this.currentStatus !== 'ready') {
      const started = await this.start();
      if (!started.ok || !this.child) {
        this.promptInFlight = false;
        this.resetIdleTimer();
        return { ok: false, error: started.error };
      }
    }
    if (!this.child) {
      this.promptInFlight = false;
      this.resetIdleTimer();
      return { ok: false, error: 'Agent process not running' };
    }

    const { promise, resolve } = Promise.withResolvers<AcpPromptResult>();
    this.activePromptResolver = resolve;

    try {
      const payload = JSON.stringify({
        event: 'user',
        message: { role: 'user', content: text },
      });
      this.child.stdin.write(`${payload}\n`);
      return await promise;
    } catch (error) {
      return { ok: false, error: errorText(error) };
    } finally {
      this.activePromptResolver = null;
      this.promptInFlight = false;
      this.resetIdleTimer();
    }
  }

  /** 取消当前轮提问：终止当前进程以中断输出 */
  cancel(): void {
    if (this.promptInFlight) {
      this.stop();
    }
  }

  /**
   * 回复权限请求。
   * agy stream-json 运行模式不接受终端交互权限决策，故始终返回 false。
   * @param _requestId - 请求 ID
   * @param _optionId - 选项 ID
   * @returns 是否认领权限
   */
  resolvePermission(_requestId: string, _optionId: string | null): boolean {
    return false;
  }

  /** 终止进程并回到空闲状态 */
  stop(): void {
    this.clearIdleTimer();
    this.promptInFlight = false;
    if (this.activePromptResolver) {
      this.activePromptResolver({ ok: false, error: 'Agent stopped' });
      this.activePromptResolver = null;
    }
    if (this.startResolver) {
      this.startResolver({ ok: false, status: 'error', error: 'Agent stopped' });
      this.startResolver = null;
    }
    const child = this.child;
    this.child = null;
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

    const { promise, resolve: resolveStart } = Promise.withResolvers<AcpStartResult>();
    this.startResolver = resolveStart;

    let timer: NodeJS.Timeout | null = setTimeout(() => {
      if (this.startResolver) {
        this.startResolver({ ok: false, status: 'error', error: 'Antigravity start timed out' });
        this.startResolver = null;
        this.stop();
      }
    }, START_TIMEOUT_MS);

    try {
      const plan = buildSpawnPlan(found, spec.args);
      const child = (this.options.spawnFn ?? defaultSpawn)(plan, this.options.cwd);
      this.attach(child);

      const result = await promise;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return result;
    } catch (error) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      this.clearIdleTimer();
      this.promptInFlight = false;
      const message = this.withStderr(errorText(error));
      const child = this.child;
      this.child = null;
      if (child) {
        (this.options.killFn ?? defaultKillProcessTree)(child);
      }
      this.setStatus('error', message);
      return { ok: false, status: 'error', error: message };
    }
  }

  private attach(child: AcpChildProcess): void {
    this.child = child;
    this.stderrTail = '';
    const decoder = new StringDecoder('utf8');
    let buffer = '';

    child.stdout.on('data', (chunk: Buffer | string) => {
      buffer += decoder.write(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) this.handleStdoutLine(line);
        newline = buffer.indexOf('\n');
      }
    });

    child.stderr?.on('data', (chunk: Buffer | string) => {
      this.stderrTail = (this.stderrTail + String(chunk)).slice(-STDERR_TAIL_MAX);
    });

    child.on('error', (error: Error) => this.handleExit(child, error.message));
    child.on('exit', (code: number | null, signal: string | null) => {
      this.handleExit(child, `Process exited (${code ?? signal ?? 'unknown'})`);
    });
  }

  private handleStdoutLine(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // 忽略非 JSON 行
      return;
    }

    const event = typeof message.event === 'string' ? message.event : '';

    if (event === 'init') {
      if (this.startResolver) {
        this.setStatus('ready');
        this.resetIdleTimer();
        this.startResolver({ ok: true });
        this.startResolver = null;
      }
      return;
    }

    if (event === 'step_update') {
      this.touchActivity();
      const su = (message.step_update ?? {}) as AgyStepUpdate;
      this.handleStepUpdate(su);
      return;
    }

    if (event === 'result') {
      this.touchActivity();
      const res = (message.result ?? {}) as AgyResult;
      if (this.activePromptResolver) {
        if (res.status === 'ERROR') {
          this.activePromptResolver({ ok: false, error: res.error || 'Execution failed' });
        } else {
          this.activePromptResolver({ ok: true, stopReason: 'end_turn' });
        }
        this.activePromptResolver = null;
      }
    }
  }

  private handleStepUpdate(su: AgyStepUpdate): void {
    const providerId = this.options.spec.id;

    if (su.step_type === 'agent_response') {
      if (su.text_delta) {
        this.options.emit({
          type: 'update',
          providerId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: su.text_delta },
          },
        });
      }
      if (su.thinking_delta) {
        this.options.emit({
          type: 'update',
          providerId,
          update: {
            sessionUpdate: 'thought_chunk',
            content: { type: 'text', text: su.thinking_delta },
          },
        });
      } else if (su.thinking && su.state === 'DONE') {
        this.options.emit({
          type: 'update',
          providerId,
          update: {
            sessionUpdate: 'thought_chunk',
            content: { type: 'text', text: su.thinking },
          },
        });
      }
      return;
    }

    if (su.step_type === 'tool') {
      const toolCallId = `agy-tool-${su.step_index ?? 'step'}`;
      if (su.state === 'ACTIVE') {
        this.options.emit({
          type: 'update',
          providerId,
          update: {
            sessionUpdate: 'tool_call',
            toolCallId,
            title: su.tool_name ?? su.tool_info?.name ?? 'tool',
            status: 'in_progress',
            content: su.tool_info?.parameters
              ? [{ type: 'content', content: { type: 'text', text: JSON.stringify(su.tool_info.parameters, null, 2) } }]
              : undefined,
          },
        });
      } else if (su.state === 'DONE' || su.state === 'ERROR') {
        const toolStatus: AcpToolStatus = su.state === 'DONE' ? 'completed' : 'failed';
        const output = su.tool_info?.output ?? su.tool_info?.error?.message;
        this.options.emit({
          type: 'update',
          providerId,
          update: {
            sessionUpdate: 'tool_call_update',
            toolCallId,
            status: toolStatus,
            content: output !== undefined
              ? [{ type: 'content', content: { type: 'text', text: String(output) } }]
              : undefined,
          },
        });
      }
    }
  }

  private handleExit(child: AcpChildProcess, reason: string): void {
    if (this.child !== child) return;
    this.clearIdleTimer();
    this.promptInFlight = false;
    const message = this.withStderr(reason);
    if (this.activePromptResolver) {
      this.activePromptResolver({ ok: false, error: message });
      this.activePromptResolver = null;
    }
    if (this.startResolver) {
      this.startResolver({ ok: false, status: 'error', error: message });
      this.startResolver = null;
    }
    this.child = null;
    this.setStatus('exited', message);
  }

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

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private touchActivity(): void {
    if (!this.promptInFlight) {
      this.resetIdleTimer();
    }
  }

  private withStderr(message: string): string {
    const tail = this.stderrTail.trim();
    return tail ? `${message}\n${tail}` : message;
  }
}
