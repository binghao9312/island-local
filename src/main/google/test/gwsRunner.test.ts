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
 * @file gwsRunner.test.ts
 * @description gws 可执行文件解析、子进程参数、输出解析与失败分类测试（子进程与文件系统全部使用 mock）
 * @author 鸡哥
 */

import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const io = vi.hoisted(() => ({
  spawn: vi.fn(),
  existsSync: vi.fn<(path: string) => boolean>(),
  readFileSync: vi.fn<(path: string) => string>(),
}));

vi.mock('child_process', () => ({ spawn: io.spawn }));
vi.mock('fs', () => ({ existsSync: io.existsSync, readFileSync: io.readFileSync }));
vi.mock('os', () => ({ homedir: () => 'C:\\Users\\tester' }));

import { GwsError, openGwsLoginTerminal, resolveGwsBinary, runGws } from '../gwsRunner';

const MCP_PATH = 'C:\\Users\\tester\\.omp\\agent\\mcp.json';
const CONFIGURED = 'C:\\npm\\gws.exe';

/** 可控的子进程替身，用于模拟 stdout、stderr、退出码与 spawn 错误。 */
class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn();
}

let child: FakeChild;

beforeEach(() => {
  vi.useFakeTimers();
  child = new FakeChild();
  io.spawn.mockReset().mockReturnValue(child);
  io.existsSync.mockReset().mockReturnValue(false);
  io.readFileSync.mockReset().mockImplementation(() => { throw new Error('ENOENT'); });
  vi.stubEnv('PATH', '');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/**
 * 让模拟子进程输出数据并以指定退出码结束。
 * @param stdout - 标准输出文本
 * @param code - 退出码
 * @param stderr - 标准错误文本
 */
function finish(stdout: string, code: number | null = 0, stderr = ''): void {
  if (stdout) child.stdout.emit('data', Buffer.from(stdout));
  if (stderr) child.stderr.emit('data', Buffer.from(stderr));
  child.emit('close', code);
}

describe('resolveGwsBinary', () => {
  it('prefers the GWS_BIN declared for google-workspace in mcp.json when it exists', () => {
    io.readFileSync.mockImplementation((path) => (path === MCP_PATH
      ? JSON.stringify({ mcpServers: { 'google-workspace': { env: { GWS_BIN: CONFIGURED } } } })
      : ''));
    io.existsSync.mockImplementation((path) => path === CONFIGURED);
    expect(resolveGwsBinary()).toBe(CONFIGURED);
  });

  it('falls back to PATH when the configured binary is missing', () => {
    vi.stubEnv('PATH', ['C:\\bin', 'C:\\tools'].join(';'));
    io.readFileSync.mockReturnValue(JSON.stringify({ mcpServers: { 'google-workspace': { env: { GWS_BIN: CONFIGURED } } } }));
    io.existsSync.mockImplementation((path) => path === 'C:\\tools\\gws.exe');
    expect(resolveGwsBinary()).toBe('C:\\tools\\gws.exe');
  });

  it('returns null when neither the config nor PATH provides gws', () => {
    vi.stubEnv('PATH', 'C:\\bin');
    expect(resolveGwsBinary()).toBeNull();
  });

  it('ignores a malformed mcp.json and still searches PATH', () => {
    vi.stubEnv('PATH', 'C:\\bin');
    io.readFileSync.mockReturnValue('{not json');
    io.existsSync.mockImplementation((path) => path === 'C:\\bin\\gws.exe');
    expect(resolveGwsBinary()).toBe('C:\\bin\\gws.exe');
  });
});

describe('runGws', () => {
  beforeEach(() => {
    io.existsSync.mockImplementation((path) => path === CONFIGURED);
    io.readFileSync.mockReturnValue(JSON.stringify({ mcpServers: { 'google-workspace': { env: { GWS_BIN: CONFIGURED } } } }));
  });

  it('rejects with a missing error without spawning when no binary is found', async () => {
    io.existsSync.mockReturnValue(false);
    await expect(runGws(['gmail'])).rejects.toMatchObject({ kind: 'missing' });
    expect(io.spawn).not.toHaveBeenCalled();
  });

  it('spawns the binary without a shell and with a hidden window', () => {
    void runGws(['gmail', 'users']).catch(() => {});
    expect(io.spawn).toHaveBeenCalledWith(CONFIGURED, ['gmail', 'users'], expect.objectContaining({ windowsHide: true, shell: false }));
  });

  it('skips the keyring preface line and resolves the JSON payload', async () => {
    const promise = runGws(['gmail']);
    finish('Using keyring backend: keyring\n{"messages":[{"id":"a","threadId":"t"}]}');
    await expect(promise).resolves.toEqual({ messages: [{ id: 'a', threadId: 't' }] });
  });

  it('rejects with an error when the output contains no JSON', async () => {
    const promise = runGws(['gmail']);
    finish('plain text only');
    await expect(promise).rejects.toMatchObject({ kind: 'error' });
  });

  it('rejects with an error when the JSON is malformed', async () => {
    const promise = runGws(['gmail']);
    finish('{"messages": [');
    await expect(promise).rejects.toBeInstanceOf(GwsError);
  });

  it.each([
    ['login required for this account', 'not-logged-in'],
    ['401 Unauthorized', 'not-logged-in'],
    ['getaddrinfo ENOTFOUND gmail.googleapis.com', 'network'],
    ['read ECONNRESET', 'network'],
    ['something unexpected', 'error'],
  ])('classifies a failed exit with stderr %j as %s', async (stderr, kind) => {
    const promise = runGws(['gmail']);
    finish('', 1, stderr);
    await expect(promise).rejects.toMatchObject({ kind });
  });

  it('maps a spawn ENOENT to missing', async () => {
    const promise = runGws(['gmail']);
    child.emit('error', Object.assign(new Error('spawn gws ENOENT'), { code: 'ENOENT' }));
    await expect(promise).rejects.toMatchObject({ kind: 'missing' });
  });

  it('times out after 20 seconds, kills the child and reports a network error', async () => {
    const promise = runGws(['gmail']);
    vi.advanceTimersByTime(19_999);
    expect(child.kill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await expect(promise).rejects.toMatchObject({ kind: 'network' });
    expect(child.kill).toHaveBeenCalledOnce();
  });

  it('never surfaces raw stderr text in the error message', async () => {
    const promise = runGws(['gmail']);
    finish('', 1, 'owner someone@example.com denied');
    const error = await promise.catch((e: unknown) => e);
    expect(String((error as Error).message)).not.toContain('someone@example.com');
  });
});

describe('openGwsLoginTerminal', () => {
  const unref = vi.fn();

  beforeEach(() => {
    unref.mockReset();
    io.spawn.mockReturnValue({ unref });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns unsupported without spawning on non-Windows platforms', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    try {
      expect(openGwsLoginTerminal()).toBe('unsupported');
    } finally {
      Object.defineProperty(process, 'platform', { value: original });
    }
    expect(io.spawn).not.toHaveBeenCalled();
  });

  it('returns missing without spawning when gws cannot be found', () => {
    if (process.platform !== 'win32') return;
    expect(openGwsLoginTerminal()).toBe('missing');
    expect(io.spawn).not.toHaveBeenCalled();
  });

  it('opens a visible detached console with a quoted binary path', () => {
    if (process.platform !== 'win32') return;
    const spaced = 'C:\Program Files\npm\gws.exe';
    io.readFileSync.mockReturnValue(JSON.stringify({ mcpServers: { 'google-workspace': { env: { GWS_BIN: spaced } } } }));
    io.existsSync.mockImplementation((path) => path === spaced);
    expect(openGwsLoginTerminal()).toBe('opened');
    expect(io.spawn).toHaveBeenCalledWith(
      'cmd.exe',
      ['/c', 'start "" cmd.exe /k ""C:\Program Files\npm\gws.exe" auth login"'],
      { detached: true, stdio: 'ignore', windowsHide: false, windowsVerbatimArguments: true },
    );
    expect(unref).toHaveBeenCalledOnce();
  });
});
