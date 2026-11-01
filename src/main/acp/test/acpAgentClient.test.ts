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
 * @file acpAgentClient.test.ts
 * @description 使用假子进程验证 ACP 客户端的握手、更新转发、权限往返、取消与进程退出处理
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { AcpEvent } from '../../../shared/acpTypes';
import { AcpAgentClient } from '../acpAgentClient';
import type { AcpChildProcess } from '../acpAgentClient';
import { ACP_PROVIDER_SPECS } from '../providers';

type Message = Record<string, unknown>;

/** 假的 ACP 智能体进程：记录客户端写入，并允许测试脚本向 stdout 注入消息 */
class FakeAgent extends EventEmitter {
  readonly stdout = new PassThrough();

  readonly stderr = new PassThrough();

  readonly received: Message[] = [];

  /** 按方法名决定如何响应客户端请求，返回 undefined 表示不自动响应 */
  responders = new Map<string, (message: Message) => unknown>();

  readonly kill = vi.fn(() => {
    this.emit('exit', null, 'SIGTERM');
  });

  readonly stdin = {
    write: (chunk: string): boolean => {
      chunk.split('\n').filter(Boolean).forEach((line) => {
        const message = JSON.parse(line) as Message;
        this.received.push(message);
        const responder = typeof message.method === 'string' ? this.responders.get(message.method) : undefined;
        if (responder && message.id !== undefined) {
          const outcome = responder(message) as { error?: unknown; result?: unknown } | undefined;
          if (outcome) this.reply(message.id, outcome);
        }
      });
      return true;
    },
  };

  /**
   * 回复客户端请求
   * @param id - 请求 id
   * @param outcome - result 或 error
   */
  reply(id: unknown, outcome: { error?: unknown; result?: unknown }): void {
    this.send({ jsonrpc: '2.0', id, ...outcome });
  }

  /**
   * 向客户端发送一条消息
   * @param message - 任意 JSON-RPC 消息
   */
  send(message: Message): void {
    this.stdout.write(`${JSON.stringify(message)}\n`);
  }

  /**
   * 找到客户端发出的某个方法的全部消息
   * @param method - 方法名
   * @returns 消息列表
   */
  calls(method: string): Message[] {
    return this.received.filter((message) => message.method === method);
  }
}

/** 创建一个握手自动成功的假智能体 */
function happyAgent(): FakeAgent {
  const agent = new FakeAgent();
  agent.responders.set('initialize', () => ({ result: { protocolVersion: 1, agentCapabilities: {} } }));
  agent.responders.set('session/new', () => ({ result: { sessionId: 'sess-1' } }));
  return agent;
}

/**
 * 构造客户端并记录事件
 * @param agents - 依次返回的假进程（支持重启时返回第二个）
 * @returns 客户端、事件列表与 spawn 记录
 */
function setup(agents: FakeAgent[]) {
  const events: AcpEvent[] = [];
  const queue = [...agents];
  const spawnFn = vi.fn(() => queue.shift() as unknown as AcpChildProcess);
  const client = new AcpAgentClient({
    spec: ACP_PROVIDER_SPECS.omp,
    cwd: '/home/u',
    emit: (event) => events.push(event),
    spawnFn,
    resolvePath: () => '/bin/omp',
    clientVersion: '9.9.9',
  });
  return { client, events, spawnFn };
}

/** 等待若干宏任务，让管道里的消息被处理 */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

describe('AcpAgentClient handshake', () => {
  it('initializes then creates a session in the home directory', async () => {
    const agent = happyAgent();
    const { client, events, spawnFn } = setup([agent]);
    await expect(client.start()).resolves.toEqual({ ok: true });
    expect(spawnFn).toHaveBeenCalledWith(expect.objectContaining({ command: '/bin/omp' }), '/home/u');
    const [init] = agent.calls('initialize');
    expect(init.params).toMatchObject({
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: 'eIsland', version: '9.9.9' },
    });
    expect(agent.calls('session/new')[0].params).toEqual({ cwd: '/home/u', mcpServers: [] });
    expect(events.filter((event) => event.type === 'status').map((event) => (event as { status: string }).status))
      .toEqual(['starting', 'ready']);
  });

  it('shares one startup between concurrent callers', async () => {
    const agent = happyAgent();
    const { client, spawnFn } = setup([agent]);
    await Promise.all([client.start(), client.start()]);
    expect(spawnFn).toHaveBeenCalledTimes(1);
  });

  it('reports not-installed without spawning when the command is missing', async () => {
    const events: AcpEvent[] = [];
    const spawnFn = vi.fn();
    const client = new AcpAgentClient({
      spec: ACP_PROVIDER_SPECS.gemini,
      cwd: '/home/u',
      emit: (event) => events.push(event),
      spawnFn,
      resolvePath: () => null,
    });
    const result = await client.start();
    expect(result).toMatchObject({ ok: false, status: 'not-installed' });
    expect(result.error).toContain('gemini-cli');
    expect(spawnFn).not.toHaveBeenCalled();
    expect(client.status).toBe('not-installed');
  });

  it('surfaces a session/new error (for example unauthenticated) and kills the process', async () => {
    const agent = new FakeAgent();
    agent.responders.set('initialize', () => ({ result: { protocolVersion: 1 } }));
    agent.responders.set('session/new', () => ({ error: { code: -32000, message: 'Please log in' } }));
    const { client } = setup([agent]);
    const result = await client.start();
    expect(result).toMatchObject({ ok: false, status: 'error' });
    expect(result.error).toContain('Please log in');
    expect(agent.kill).toHaveBeenCalled();
    expect(client.status).toBe('error');
  });
});

describe('AcpAgentClient prompt and updates', () => {
  it('sends image blocks before the text block and returns the stop reason', async () => {
    const agent = happyAgent();
    agent.responders.set('session/prompt', () => ({ result: { stopReason: 'end_turn' } }));
    const { client } = setup([agent]);
    const result = await client.prompt('describe', [{ data: 'AAAA', mimeType: 'image/png' }]);
    expect(result).toEqual({ ok: true, stopReason: 'end_turn' });
    expect(agent.calls('session/prompt')[0].params).toEqual({
      sessionId: 'sess-1',
      prompt: [
        { type: 'image', data: 'AAAA', mimeType: 'image/png' },
        { type: 'text', text: 'describe' },
      ],
    });
  });

  it('forwards session/update notifications as events', async () => {
    const agent = happyAgent();
    const { client, events } = setup([agent]);
    await client.start();
    agent.send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: { sessionId: 'sess-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } } },
    });
    await tick();
    expect(events).toContainEqual({
      type: 'update',
      providerId: 'omp',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } },
    });
  });

  it('rejects unsupported agent-to-client requests with method not found', async () => {
    const agent = happyAgent();
    const { client } = setup([agent]);
    await client.start();
    agent.send({ jsonrpc: '2.0', id: 'fs-1', method: 'fs/read_text_file', params: { path: 'x' } });
    await tick();
    const reply = agent.received.find((message) => message.id === 'fs-1');
    expect(reply?.error).toMatchObject({ code: -32601 });
  });
});

describe('AcpAgentClient permission round-trip', () => {
  const permissionParams = {
    sessionId: 'sess-1',
    toolCall: { toolCallId: 'c1', title: 'echo hi', kind: 'execute' },
    options: [
      { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
      { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
    ],
  };

  it('forwards the request and answers with the selected option id', async () => {
    const agent = happyAgent();
    const { client, events } = setup([agent]);
    await client.start();
    agent.send({ jsonrpc: '2.0', id: 11, method: 'session/request_permission', params: permissionParams });
    await tick();
    const request = events.find((event) => event.type === 'permission');
    expect(request).toMatchObject({
      type: 'permission',
      request: { providerId: 'omp', title: 'echo hi', toolKind: 'execute' },
    });
    const requestId = (request as { request: { requestId: string } }).request.requestId;
    expect(client.resolvePermission(requestId, 'allow_once')).toBe(true);
    await tick();
    expect(agent.received.find((message) => message.id === 11)?.result)
      .toEqual({ outcome: { outcome: 'selected', optionId: 'allow_once' } });
    expect(client.resolvePermission(requestId, 'allow_once')).toBe(false);
  });

  it('answers cancelled when the user rejects with null', async () => {
    const agent = happyAgent();
    const { client, events } = setup([agent]);
    await client.start();
    agent.send({ jsonrpc: '2.0', id: 12, method: 'session/request_permission', params: permissionParams });
    await tick();
    const requestId = (events.find((event) => event.type === 'permission') as { request: { requestId: string } }).request.requestId;
    client.resolvePermission(requestId, null);
    await tick();
    expect(agent.received.find((message) => message.id === 12)?.result).toEqual({ outcome: { outcome: 'cancelled' } });
  });

  it('cancel sends session/cancel and answers pending permissions as cancelled', async () => {
    const agent = happyAgent();
    const { client, events } = setup([agent]);
    await client.start();
    agent.send({ jsonrpc: '2.0', id: 13, method: 'session/request_permission', params: permissionParams });
    await tick();
    client.cancel();
    await tick();
    expect(agent.calls('session/cancel')[0].params).toEqual({ sessionId: 'sess-1' });
    expect(agent.received.find((message) => message.id === 13)?.result).toEqual({ outcome: { outcome: 'cancelled' } });
    expect(events.some((event) => event.type === 'permission-cancelled')).toBe(true);
  });
});

describe('AcpAgentClient process lifecycle', () => {
  it('fails an in-flight prompt when the process exits and includes stderr', async () => {
    const agent = happyAgent();
    const { client, events } = setup([agent]);
    await client.start();
    const pending = client.prompt('long task');
    await tick();
    agent.stderr.write('fatal: out of memory');
    await tick();
    agent.emit('exit', 1, null);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Process exited (1)');
    expect(result.error).toContain('out of memory');
    expect(client.status).toBe('exited');
    expect(events.at(-1)).toMatchObject({ type: 'status', status: 'exited' });
  });

  it('restarts transparently on the next prompt after the process died', async () => {
    const first = happyAgent();
    const second = happyAgent();
    second.responders.set('session/prompt', () => ({ result: { stopReason: 'end_turn' } }));
    const { client, spawnFn } = setup([first, second]);
    await client.start();
    first.emit('exit', 0, null);
    expect(client.status).toBe('exited');
    await expect(client.prompt('again')).resolves.toEqual({ ok: true, stopReason: 'end_turn' });
    expect(spawnFn).toHaveBeenCalledTimes(2);
    expect(client.status).toBe('ready');
  });

  it('treats a spawn error as a failed start', async () => {
    const agent = new FakeAgent();
    const { client } = setup([agent]);
    const starting = client.start();
    agent.emit('error', new Error('spawn ENOENT'));
    const result = await starting;
    expect(result.ok).toBe(false);
    expect(result.error).toContain('spawn ENOENT');
  });

  it('stop kills the process and returns to idle', async () => {
    const agent = happyAgent();
    const { client } = setup([agent]);
    await client.start();
    client.stop();
    expect(agent.kill).toHaveBeenCalled();
    expect(client.status).toBe('idle');
  });
});
