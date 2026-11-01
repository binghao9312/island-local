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
 * @file jsonRpc.ts
 * @description 基于换行分隔 JSON 的 JSON-RPC 2.0 双向连接，负责分帧、请求响应关联与入站请求分发
 * @author 鸡哥
 */

import { StringDecoder } from 'node:string_decoder';
import { JsonRpcError } from './jsonRpcError';

/** 入站数据源，需要能订阅 data 事件 */
export interface JsonRpcInput {
  on(event: 'data', listener: (chunk: Buffer | string) => void): unknown;
}

/** 出站数据汇，只需要 write */
export interface JsonRpcOutput {
  write(chunk: string): unknown;
}

/** 连接回调 */
export interface JsonRpcHandlers {
  /** 处理对端发来的请求，返回值作为 result，抛出 JsonRpcError 则作为 error 回复 */
  onRequest(method: string, params: unknown): Promise<unknown>;
  /** 处理对端发来的通知 */
  onNotification(method: string, params: unknown): void;
  /** 收到无法解析的行时调用（例如 CLI 把日志打到了 stdout） */
  onMalformedLine?(line: string): void;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(reason: Error): void;
}

/** JSON-RPC 2.0 连接 */
export class JsonRpcConnection {
  private readonly output: JsonRpcOutput;

  private readonly handlers: JsonRpcHandlers;

  private readonly pending = new Map<number, PendingRequest>();

  private readonly decoder = new StringDecoder('utf8');

  private buffer = '';

  private nextId = 1;

  private closed = false;

  /**
   * @param input - 对端输出流（子进程 stdout）
   * @param output - 对端输入流（子进程 stdin）
   * @param handlers - 入站请求与通知的处理回调
   */
  constructor(input: JsonRpcInput, output: JsonRpcOutput, handlers: JsonRpcHandlers) {
    this.output = output;
    this.handlers = handlers;
    input.on('data', (chunk) => this.feed(chunk));
  }

  /**
   * 发送请求并等待响应
   * @param method - 方法名
   * @param params - 参数对象
   * @returns 对端返回的 result
   */
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Connection closed'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  /**
   * 发送通知（不期待响应）
   * @param method - 方法名
   * @param params - 参数对象
   */
  notify(method: string, params?: unknown): void {
    if (this.closed) return;
    this.send({ jsonrpc: '2.0', method, params });
  }

  /**
   * 关闭连接并拒绝所有未完成的请求
   * @param reason - 拒绝原因
   */
  close(reason: Error): void {
    if (this.closed) return;
    this.closed = true;
    const waiting = [...this.pending.values()];
    this.pending.clear();
    waiting.forEach((entry) => entry.reject(reason));
  }

  private send(message: Record<string, unknown>): void {
    try {
      this.output.write(`${JSON.stringify(message)}\n`);
    } catch {
      // 管道已断开时由进程退出流程负责清理挂起的请求
    }
  }

  private feed(chunk: Buffer | string): void {
    this.buffer += typeof chunk === 'string' ? chunk : this.decoder.write(chunk);
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) this.handleLine(line);
      newline = this.buffer.indexOf('\n');
    }
  }

  private handleLine(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      this.handlers.onMalformedLine?.(line);
      return;
    }
    if (typeof message !== 'object' || message === null) {
      this.handlers.onMalformedLine?.(line);
      return;
    }
    const record = message as Record<string, unknown>;
    const hasMethod = typeof record.method === 'string';
    if (hasMethod && record.id !== undefined && record.id !== null) {
      void this.dispatchRequest(record.id as string | number, record.method as string, record.params);
    } else if (hasMethod) {
      this.handlers.onNotification(record.method as string, record.params);
    } else if (typeof record.id === 'number') {
      this.settle(record.id, record);
    }
  }

  private settle(id: number, record: Record<string, unknown>): void {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id);
    const error = record.error as { code?: number; message?: string } | undefined;
    if (error) {
      entry.reject(new JsonRpcError(error.code ?? -32603, error.message ?? 'Unknown error'));
    } else {
      entry.resolve(record.result);
    }
  }

  private async dispatchRequest(id: string | number, method: string, params: unknown): Promise<void> {
    try {
      const result = await this.handlers.onRequest(method, params);
      this.send({ jsonrpc: '2.0', id, result: result ?? null });
    } catch (error) {
      const code = error instanceof JsonRpcError ? error.code : -32603;
      const message = error instanceof Error ? error.message : String(error);
      this.send({ jsonrpc: '2.0', id, error: { code, message } });
    }
  }
}
