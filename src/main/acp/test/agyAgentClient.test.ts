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
 * @file agyAgentClient.test.ts
 * @description Antigravity (agy stream-json) 适配器测试：init 启动、文字增量、思考过程、工具调用流式映射与空闲自动停止
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { AcpEvent } from '../../../shared/acpTypes';
import type { AcpChildProcess } from '../acpAgentClient';
import { AgyAgentClient } from '../agyAgentClient';
import { ACP_PROVIDER_SPECS } from '../providers';

/** 假 agy 子进程 */
class FakeAgyProcess extends EventEmitter {
  readonly stdout = new PassThrough();

  readonly stderr = new PassThrough();

  readonly received: string[] = [];

  readonly kill = vi.fn(() => {
    this.emit('exit', 0, null);
  });

  readonly stdin = {
    write: (chunk: string): boolean => {
      this.received.push(chunk);
      return true;
    },
  };

  /**
   * 向 stdout 注入一行 NDJSON
   * @param payload - 对象
   */
  emitJson(payload: Record<string, unknown>): void {
    this.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}

/**
 * 设置 AgyAgentClient 测试夹具
 * @param proc - 假进程
 * @param customKiller - 注入的杀进程函数
 * @returns 客户端与事件列表
 */
function setupAgy(proc: FakeAgyProcess, customKiller?: (child: AcpChildProcess) => void) {
  const events: AcpEvent[] = [];
  const client = new AgyAgentClient({
    spec: ACP_PROVIDER_SPECS.antigravity,
    cwd: '/workspace',
    emit: (event) => events.push(event),
    spawnFn: () => proc as unknown as AcpChildProcess,
    resolvePath: () => '/bin/agy',
    killFn: customKiller,
  });
  return { client, events };
}

describe('AgyAgentClient', () => {
  it('starts process and transitions to ready on init event', async () => {
    const proc = new FakeAgyProcess();
    const { client, events } = setupAgy(proc);

    const startPromise = client.start();
    expect(client.status).toBe('starting');

    proc.emitJson({ event: 'init', conversation_id: 'conv-123', init: { model: 'gemini' } });
    const result = await startPromise;

    expect(result.ok).toBe(true);
    expect(client.status).toBe('ready');
    expect(events).toContainEqual(expect.objectContaining({ type: 'status', status: 'ready' }));
  });

  it('sends user message on stdin and streams text and thinking updates', async () => {
    const proc = new FakeAgyProcess();
    const { client, events } = setupAgy(proc);

    const startPromise = client.start();
    proc.emitJson({ event: 'init', conversation_id: 'conv-1', init: {} });
    await startPromise;

    const promptPromise = client.prompt('say hello');
    expect(proc.received[0]).toContain('"content":"say hello"');

    // Text chunk
    proc.emitJson({
      event: 'step_update',
      step_update: {
        step_type: 'agent_response',
        text_delta: 'Hello, ',
      },
    });

    // Thinking chunk
    proc.emitJson({
      event: 'step_update',
      step_update: {
        step_type: 'agent_response',
        thinking_delta: 'Thinking...',
      },
    });

    // Terminal result
    proc.emitJson({
      event: 'result',
      result: {
        status: 'SUCCESS',
        response: 'Hello, world!',
      },
    });

    const res = await promptPromise;
    expect(res).toEqual({ ok: true, stopReason: 'end_turn' });

    expect(events).toContainEqual({
      type: 'update',
      providerId: 'antigravity',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Hello, ' },
      },
    });

    expect(events).toContainEqual({
      type: 'update',
      providerId: 'antigravity',
      update: {
        sessionUpdate: 'thought_chunk',
        content: { type: 'text', text: 'Thinking...' },
      },
    });
  });

  it('maps tool call and tool completion updates', async () => {
    const proc = new FakeAgyProcess();
    const { client, events } = setupAgy(proc);

    const startPromise = client.start();
    proc.emitJson({ event: 'init', conversation_id: 'conv-1', init: {} });
    await startPromise;

    const promptPromise = client.prompt('check file');

    // Tool start
    proc.emitJson({
      event: 'step_update',
      step_update: {
        step_type: 'tool',
        step_index: 2,
        state: 'ACTIVE',
        tool_name: 'read_file',
        tool_info: { name: 'read_file', parameters: { path: 'a.txt' } },
      },
    });

    // Tool finish
    proc.emitJson({
      event: 'step_update',
      step_update: {
        step_type: 'tool',
        step_index: 2,
        state: 'DONE',
        tool_name: 'read_file',
        tool_info: { name: 'read_file', parameters: { path: 'a.txt' }, output: 'file contents' },
      },
    });

    proc.emitJson({ event: 'result', result: { status: 'SUCCESS', response: 'done' } });
    await promptPromise;

    expect(events).toContainEqual(expect.objectContaining({
      type: 'update',
      providerId: 'antigravity',
      update: expect.objectContaining({
        sessionUpdate: 'tool_call',
        toolCallId: 'agy-tool-2',
        title: 'read_file',
        status: 'in_progress',
      }),
    }));

    expect(events).toContainEqual(expect.objectContaining({
      type: 'update',
      providerId: 'antigravity',
      update: expect.objectContaining({
        sessionUpdate: 'tool_call_update',
        toolCallId: 'agy-tool-2',
        status: 'completed',
        content: [{ type: 'content', content: { type: 'text', text: 'file contents' } }],
      }),
    }));
  });

  it('reports error when agy returns error result', async () => {
    const proc = new FakeAgyProcess();
    const { client } = setupAgy(proc);

    const startPromise = client.start();
    proc.emitJson({ event: 'init', conversation_id: 'conv-1', init: {} });
    await startPromise;

    const promptPromise = client.prompt('fail please');
    proc.emitJson({ event: 'result', result: { status: 'ERROR', error: 'Quota reached' } });

    const result = await promptPromise;
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Quota reached');
  });

  it('kills process tree and auto-stops after 10 minutes of inactivity', async () => {
    vi.useFakeTimers();
    try {
      const proc = new FakeAgyProcess();
      const killFn = vi.fn();
      const { client } = setupAgy(proc, killFn);

      const startPromise = client.start();
      proc.emitJson({ event: 'init', conversation_id: 'conv-1', init: {} });
      await startPromise;
      expect(client.status).toBe('ready');

      // 10 minutes pass
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(client.status).toBe('idle');
      expect(killFn).toHaveBeenCalledWith(proc);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolvePermission returns false since stream-json mode does not support interactive permissions', () => {
    const proc = new FakeAgyProcess();
    const { client } = setupAgy(proc);
    expect(client.resolvePermission('perm-1', 'allow')).toBe(false);
  });
});
