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
 * @file providers.ts
 * @description ACP 智能体供应商定义与命令行解析（Windows 下解析 .cmd 垫片且不弹出终端窗口）
 * @author 鸡哥
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AcpProviderId } from '../../shared/acpTypes';

/** 供应商启动规格 */
export interface AcpProviderSpec {
  /** 供应商标识 */
  id: AcpProviderId;
  /** 展示名称 */
  label: string;
  /** 命令名（不含扩展名） */
  command: string;
  /** 启动参数；必须只含 [A-Za-z0-9_.=-]，以便安全拼进 cmd.exe 命令行 */
  args: string[];
  /** 未安装时提示的安装命令 */
  installHint: string;
}

/** 解析命令所需的运行环境，便于测试时注入 */
export interface ResolveEnv {
  /** 平台标识 */
  platform: NodeJS.Platform;
  /** 环境变量 */
  env: NodeJS.ProcessEnv;
  /** 判断文件是否存在 */
  exists: (filePath: string) => boolean;
}

/** 可直接交给 child_process.spawn 的启动描述 */
export interface SpawnPlan {
  /** 可执行文件 */
  command: string;
  /** 参数列表 */
  args: string[];
  /** 是否使用原样参数（Windows 经由 cmd.exe 时为 true） */
  windowsVerbatimArguments: boolean;
}

/**
 * 内置供应商表。
 * Gemini 与 omp 都显式要求"每次询问"，不能默认放行工具调用：
 * Gemini 用 --approval-mode default；omp 默认自动批准，必须用 always-ask 覆盖。
 */
export const ACP_PROVIDER_SPECS: Record<AcpProviderId, AcpProviderSpec> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini CLI',
    command: 'gemini',
    args: ['--acp', '--approval-mode', 'default'],
    installHint: 'npm install -g @google/gemini-cli',
  },
  omp: {
    id: 'omp',
    label: 'omp',
    command: 'omp',
    args: ['--allow-home', '--approval-mode=always-ask', 'acp'],
    installHint: 'npm install -g @oh-my-pi/pi-coding-agent',
  },
};

const SAFE_ARG = /^[A-Za-z0-9_.=-]+$/;

/**
 * 返回默认的真实运行环境
 * @returns 基于当前进程的解析环境
 */
export function defaultResolveEnv(): ResolveEnv {
  return { platform: process.platform, env: process.env, exists: existsSync };
}

/**
 * 在 PATH 与常见全局安装目录中查找命令
 * @param name - 命令名（不含扩展名）
 * @param resolveEnv - 解析环境
 * @returns 命令的完整路径，未找到返回 null
 */
export function resolveCommand(name: string, resolveEnv: ResolveEnv = defaultResolveEnv()): string | null {
  const { platform, env, exists } = resolveEnv;
  const flavor = platform === 'win32' ? path.win32 : path.posix;
  const pathValue = env.PATH ?? env.Path ?? '';
  const dirs = pathValue.split(flavor.delimiter).filter(Boolean);
  if (platform === 'win32') {
    if (env.APPDATA) dirs.push(flavor.join(env.APPDATA, 'npm'));
    if (env.LOCALAPPDATA) dirs.push(flavor.join(env.LOCALAPPDATA, 'omp'));
  }
  const extensions = platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];
  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = flavor.join(dir, `${name}${ext}`);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * 生成启动计划；Windows 下的 .cmd 垫片经 cmd.exe 运行，参数原样传递以避免二次转义
 * @param resolvedPath - resolveCommand 返回的完整路径
 * @param args - 启动参数
 * @param resolveEnv - 解析环境
 * @returns 启动计划
 */
export function buildSpawnPlan(resolvedPath: string, args: string[], resolveEnv: ResolveEnv = defaultResolveEnv()): SpawnPlan {
  if (!args.every((arg) => SAFE_ARG.test(arg))) {
    throw new Error('Unsafe ACP launch argument');
  }
  const lower = resolvedPath.toLowerCase();
  if (resolveEnv.platform === 'win32' && (lower.endsWith('.cmd') || lower.endsWith('.bat'))) {
    const shell = resolveEnv.env.ComSpec ?? 'cmd.exe';
    return {
      command: shell,
      args: ['/d', '/s', '/c', `""${resolvedPath}" ${args.join(' ')}"`],
      windowsVerbatimArguments: true,
    };
  }
  return { command: resolvedPath, args, windowsVerbatimArguments: false };
}
