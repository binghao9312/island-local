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
 * @file jsonRpc.test.ts
 * @description JSON-RPC 连接的分帧、请求响应关联与入站请求分发测试
 * @author 鸡哥
 */

import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { JsonRpcConnection } from '../jsonRpc';
import type { JsonRpcHandlers } from '../jsonRpc';
import { JsonRpcError } from '../jsonRpcError';

/**
 * 创建带假管道的连接
 * @param overrides - 覆盖默认处理回调
 * @returns 连接、对端输入输出与已写出的消息
 */
function setup(overrides: Partial<JsonRpcHandlers> = {}) {
  const input = new PassThrough();
  const written: string[] = [];
  const handlers: JsonRpcHandlers = {
    onRequest: vi.fn(async () => ({ handled: true })),
    onNotification: vi.fn(),
    onMalformedLine: vi.fn(),
    ...overrides,
  };
  const connection = new JsonRpcConnection(input, { write: (chunk) => written.push(chunk) }, handlers);
  const sent = (): Array<Record<string, unknown>> => written.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { connection, input, written, handlers, sent };
}

/** 等待微任务队列清空 */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('JsonRpcConnection framing', () => {
  it('writes one JSON object per line', () => {
    const { connection, written } = setup();
    void connection.request('initialize', { protocolVersion: 1 });
    expect(written).toHaveLength(1);
    expect(written[0].endsWith('\n')).toBe(true);
    expect(JSON.parse(written[0])).toEqual({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1 } });
  });

  it('reassembles a message split across chunks and handles several messages per chunk', () => {
    const { input, handlers } = setup();
    const a = JSON.stringify({ jsonrpc: '2.0', method: 'session/update', params: { n: 1 } });
    const b = JSON.stringify({ jsonrpc: '2.0', method: 'session/update', params: { n: 2 } });
    input.write(a.slice(0, 10));
    expect(handlers.onNotification).not.toHaveBeenCalled();
    input.write(`${a.slice(10)}\n${b}\n`);
    expect(handlers.onNotification).toHaveBeenCalledTimes(2);
    expect(handlers.onNotification).toHaveBeenNthCalledWith(1, 'session/update', { n: 1 });
    expect(handlers.onNotification).toHaveBeenNthCalledWith(2, 'session/update', { n: 2 });
  });

  it('does not corrupt multibyte characters split between byte chunks', () => {
    const { input, handlers } = setup();
    const bytes = Buffer.from(`${JSON.stringify({ jsonrpc: '2.0', method: 'm', params: { text: '你好' } })}\n`, 'utf8');
    const cut = bytes.indexOf(Buffer.from('你', 'utf8')) + 1;
    input.write(bytes.subarray(0, cut));
    input.write(bytes.subarray(cut));
    expect(handlers.onNotification).toHaveBeenCalledWith('m', { text: '你好' });
  });

  it('tolerates CRLF and blank lines and reports malformed lines without throwing', () => {
    const { input, handlers } = setup();
    input.write('\r\n\n');
    input.write('not json at all\n');
    input.write('42\n');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'ok' })}\r\n`);
    expect(handlers.onMalformedLine).toHaveBeenCalledTimes(2);
    expect(handlers.onNotification).toHaveBeenCalledWith('ok', undefined);
  });
});

describe('JsonRpcConnection request correlation', () => {
  it('resolves out-of-order responses to the matching request', async () => {
    const { connection, input } = setup();
    const first = connection.request<string>('a');
    const second = connection.request<string>('b');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, result: 'second' })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'first' })}\n`);
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
  });

  it('rejects with JsonRpcError carrying the remote code', async () => {
    const { connection, input } = setup();
    const pending = connection.request('session/new');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'auth required' } })}\n`);
    await expect(pending).rejects.toMatchObject({ name: 'JsonRpcError', code: -32000, message: 'auth required' });
  });

  it('ignores responses with unknown ids', () => {
    const { input, handlers } = setup();
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 99, result: 1 })}\n`);
    expect(handlers.onNotification).not.toHaveBeenCalled();
  });

  it('rejects pending requests on close and refuses new ones', async () => {
    const { connection } = setup();
    const pending = connection.request('x');
    connection.close(new Error('gone'));
    await expect(pending).rejects.toThrow('gone');
    await expect(connection.request('y')).rejects.toThrow('Connection closed');
  });

  it('sends notifications without an id', () => {
    const { connection, sent } = setup();
    connection.notify('session/cancel', { sessionId: 's' });
    expect(sent()[0]).toEqual({ jsonrpc: '2.0', method: 'session/cancel', params: { sessionId: 's' } });
  });
});

describe('JsonRpcConnection inbound requests', () => {
  it('replies with the handler result using the original id', async () => {
    const { input, sent } = setup({ onRequest: async () => ({ outcome: 'ok' }) });
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 'abc', method: 'session/request_permission', params: {} })}\n`);
    await flush();
    expect(sent()).toEqual([{ jsonrpc: '2.0', id: 'abc', result: { outcome: 'ok' } }]);
  });

  it('replies with an error carrying the JsonRpcError code', async () => {
    const { input, sent } = setup({
      onRequest: async () => {
        throw new JsonRpcError(-32601, 'Method not found: fs/read');
      },
    });
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'fs/read', params: {} })}\n`);
    await flush();
    expect(sent()).toEqual([{ jsonrpc: '2.0', id: 7, error: { code: -32601, message: 'Method not found: fs/read' } }]);
  });

  it('maps unexpected exceptions to -32603', async () => {
    const { input, sent } = setup({
      onRequest: async () => {
        throw new Error('boom');
      },
    });
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'x' })}\n`);
    await flush();
    expect(sent()).toEqual([{ jsonrpc: '2.0', id: 8, error: { code: -32603, message: 'boom' } }]);
  });
});
