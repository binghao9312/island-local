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
 * @file gwsRunner.ts
 * @description 通过已登录的 Google Workspace CLI（gws）执行命令并解析 JSON 输出。eIsland 不保存任何凭据，认证由 gws 自身的 keyring 完成。
 * @author 鸡哥
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { delimiter, join } from 'path';

/** gws 失败分类：missing 未找到可执行文件；not-logged-in 未认证；network 网络失败或超时；error 其他 */
export type GwsErrorKind = 'missing' | 'not-logged-in' | 'network' | 'error';

/** gws 调用失败的类型化错误，错误信息不包含 gws 的 stderr（可能含邮箱地址） */
export class GwsError extends Error {
  readonly kind: GwsErrorKind;

  constructor(kind: GwsErrorKind, message: string) {
    super(message);
    this.name = 'GwsError';
    this.kind = kind;
  }
}

/** 单次 gws 调用超时时间（毫秒） */
const GWS_TIMEOUT_MS = 20_000;

/**
 * 读取 mcp.json 中 google-workspace 服务声明的 GWS_BIN。
 * @returns 配置的可执行文件路径；文件缺失或字段无效时返回 null
 */
function readConfiguredGwsBin(): string | null {
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.omp', 'agent', 'mcp.json'), 'utf-8')) as {
      mcpServers?: Record<string, { env?: Record<string, unknown> } | undefined>;
    };
    const value = config.mcpServers?.['google-workspace']?.env?.GWS_BIN;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/**
 * 解析 gws 可执行文件路径。优先使用 mcp.json 中的 GWS_BIN，其次在 PATH 中查找。
 * @returns 可执行文件的绝对路径；未找到时返回 null
 */
export function resolveGwsBinary(): string | null {
  const configured = readConfiguredGwsBin();
  if (configured && existsSync(configured)) return configured;
  const names = process.platform === 'win32' ? ['gws.exe'] : ['gws'];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    // npm 全局安装只在 PATH 放 .cmd 包装脚本，真正的 gws.exe 位于同一前缀下的包目录
    if (process.platform === 'win32') {
      const npmPackaged = join(dir, 'node_modules', '@googleworkspace', 'cli', 'bin', 'gws.exe');
      if (existsSync(npmPackaged)) return npmPackaged;
    }
  }
  return null;
}

/**
 * 将 gws 的 stderr 归类为认证或网络问题，无法识别时归为 error。
 * @param stderr - gws 进程的标准错误输出（仅用于分类，不会外传）
 * @returns 失败分类
 */
function classifyStderr(stderr: string): GwsErrorKind {
  if (/login|logged in|auth|credential|unauthori[sz]ed|401/i.test(stderr)) return 'not-logged-in';
  if (/network|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|dns|offline/i.test(stderr)) return 'network';
  return 'error';
}

/**
 * 以参数数组直接启动 gws（不经过 shell），并解析其 JSON 输出。
 * @description gws 可能在 JSON 前输出 "Using keyring backend" 等提示行，解析前会跳过第一个 "{" 之前的内容。
 * @param args - gws 子命令与参数，例如 ['gmail', 'users', 'messages', 'list', '--params', '{...}']
 * @returns 解析后的 JSON 值
 * @throws GwsError 找不到 gws、认证失败、网络失败、超时或输出无法解析
 */
export function runGws(args: string[]): Promise<unknown> {
  const bin = resolveGwsBinary();
  if (!bin) return Promise.reject(new GwsError('missing', 'gws executable not found'));

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error: GwsError | null, value?: unknown): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    const child = spawn(bin, args, { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    timer = setTimeout(() => {
      child.kill();
      finish(new GwsError('network', 'gws timed out'));
    }, GWS_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8'); });
    child.on('error', (error: NodeJS.ErrnoException) => {
      finish(new GwsError(error.code === 'ENOENT' ? 'missing' : 'error', 'gws failed to start'));
    });
    child.on('close', (code: number | null) => {
      if (code !== 0) {
        finish(new GwsError(classifyStderr(stderr), `gws exited with code ${code}`));
        return;
      }
      const start = stdout.indexOf('{');
      if (start < 0) {
        finish(new GwsError('error', 'gws output contains no JSON'));
        return;
      }
      try {
        finish(null, JSON.parse(stdout.slice(start)));
      } catch {
        finish(new GwsError('error', 'gws output is not valid JSON'));
      }
    });
  });
}

/** 打开 gws 登录终端的结果：opened 已打开；missing 未找到 gws；unsupported 当前平台不支持 */
export type GwsLoginResult = 'opened' | 'missing' | 'unsupported';

/**
 * 在新的可见控制台窗口中运行 `gws auth login`，让用户可在其中操作权限选择与浏览器授权。
 * @description 参数以原样字符串传给 cmd.exe（windowsVerbatimArguments），避免 Node 对空标题 "" 做二次转义；
 * 外层额外一对引号由 cmd /k 剥离，从而兼容含空格的路径。不会等待登录完成。
 * @returns 'opened' 已打开登录窗口；'missing' 未找到 gws；'unsupported' 非 Windows 平台
 */
export function openGwsLoginTerminal(): GwsLoginResult {
  if (process.platform !== 'win32') return 'unsupported';
  const bin = resolveGwsBinary();
  if (!bin) return 'missing';
  spawn('cmd.exe', ['/c', `start "" cmd.exe /k ""${bin}" auth login"`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    windowsVerbatimArguments: true,
  }).unref();
  return 'opened';
}
