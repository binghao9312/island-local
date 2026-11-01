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
 * @file providers.test.ts
 * @description 供应商命令解析与启动计划（含 Windows .cmd 垫片）测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { ACP_PROVIDER_SPECS, buildSpawnPlan, resolveCommand } from '../providers';
import type { ResolveEnv } from '../providers';

/**
 * 构造假的 Windows 解析环境
 * @param existing - 视为存在的文件路径集合
 * @returns 解析环境
 */
function winEnv(existing: string[]): ResolveEnv {
  return {
    platform: 'win32',
    env: {
      PATH: 'C:\\Windows;C:\\tools',
      APPDATA: 'C:\\Users\\u\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local',
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
    },
    exists: (filePath) => existing.includes(filePath),
  };
}

describe('resolveCommand', () => {
  it('prefers PATH hits and tries .exe before .cmd on Windows', () => {
    const env = winEnv(['C:\\tools\\omp.cmd', 'C:\\tools\\omp.exe']);
    expect(resolveCommand('omp', env)).toBe('C:\\tools\\omp.exe');
  });

  it('falls back to the global npm directory for .cmd shims', () => {
    const env = winEnv(['C:\\Users\\u\\AppData\\Roaming\\npm\\gemini.cmd']);
    expect(resolveCommand('gemini', env)).toBe('C:\\Users\\u\\AppData\\Roaming\\npm\\gemini.cmd');
  });

  it('returns null when nothing matches', () => {
    expect(resolveCommand('gemini', winEnv([]))).toBeNull();
  });

  it('uses plain names on POSIX platforms', () => {
    const env: ResolveEnv = { platform: 'linux', env: { PATH: '/usr/bin:/opt/bin' }, exists: (p) => p === '/opt/bin/omp' };
    expect(resolveCommand('omp', env)).toBe('/opt/bin/omp');
  });
});

describe('buildSpawnPlan', () => {
  it('routes .cmd shims through cmd.exe with verbatim arguments', () => {
    const env = winEnv([]);
    const plan = buildSpawnPlan('C:\\Users\\u\\AppData\\Roaming\\npm\\gemini.cmd', ACP_PROVIDER_SPECS.gemini.args, env);
    expect(plan.command).toBe('C:\\Windows\\System32\\cmd.exe');
    expect(plan.windowsVerbatimArguments).toBe(true);
    expect(plan.args).toEqual([
      '/d', '/s', '/c',
      '""C:\\Users\\u\\AppData\\Roaming\\npm\\gemini.cmd" --acp --approval-mode default"',
    ]);
  });

  it('runs real executables directly', () => {
    const plan = buildSpawnPlan('C:\\tools\\omp.exe', ACP_PROVIDER_SPECS.omp.args, winEnv([]));
    expect(plan).toEqual({ command: 'C:\\tools\\omp.exe', args: ACP_PROVIDER_SPECS.omp.args, windowsVerbatimArguments: false });
  });

  it('refuses arguments that could break out of the shell command line', () => {
    expect(() => buildSpawnPlan('C:\\a\\x.cmd', ['--acp', '& calc'], winEnv([]))).toThrow('Unsafe');
  });

  it('never lets omp auto-approve tool calls', () => {
    expect(ACP_PROVIDER_SPECS.omp.args).toContain('--approval-mode=always-ask');
    expect(ACP_PROVIDER_SPECS.omp.args).not.toContain('--auto-approve');
    expect(ACP_PROVIDER_SPECS.gemini.args).not.toContain('--yolo');
    expect(ACP_PROVIDER_SPECS.antigravity.args).not.toContain('--dangerously-skip-permissions');
  });
});
