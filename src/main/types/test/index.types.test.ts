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
 * @file index.types.test.ts
 * @description 验证公共类型门面的每个导出都保留原定义身份，防止漏导出和错误映射。
 * @author 鸡哥
 */

import { describe, expectTypeOf, it } from 'vitest';
import type * as PublicTypes from '../index';
import type { IslandPositionOffset as DirectIslandPositionOffset } from '../config/IslandPositionOffset';
import type { ChunkInfo as DirectChunkInfo } from '../core/ChunkInfo';
import type { DownloadTaskSnapshot as DirectDownloadTaskSnapshot, DownloadTaskStatus as DirectDownloadTaskStatus } from '../core/DownloadTaskSnapshot';
import type { StartDownloadOptions as DirectStartDownloadOptions } from '../core/StartDownloadOptions';
import type { ClaudeCodeHeatmapDailyCount as DirectClaudeCodeHeatmapDailyCount, ClaudeCodeHeatmapDaily as DirectClaudeCodeHeatmapDaily } from '../system/ClaudeCodeHeatmapDailyCount';
import type { ClaudeCodeHookEvent as DirectClaudeCodeHookEvent, ClaudeCodeHookEventKind as DirectClaudeCodeHookEventKind } from '../system/ClaudeCodeHookEvent';
import type { ClaudeCodeHookEventDetailItem as DirectClaudeCodeHookEventDetailItem } from '../system/ClaudeCodeHookEventDetailItem';
import type { ClaudeCodeSessionSnapshot as DirectClaudeCodeSessionSnapshot, ClaudeCodeSessionPhase as DirectClaudeCodeSessionPhase } from '../system/ClaudeCodeSessionSnapshot';
import type { ClaudeCodeStatusService as DirectClaudeCodeStatusService, ClaudeSettingsMutationResult as DirectClaudeSettingsMutationResult, PermissionDecision as DirectPermissionDecision } from '../system/ClaudeCodeStatusService';
import type { ClaudeCodeStatusSnapshot as DirectClaudeCodeStatusSnapshot } from '../system/ClaudeCodeStatusSnapshot';
import type { CodexStatusService as DirectCodexStatusService, CodexMonitorMutationResult as DirectCodexMonitorMutationResult } from '../system/CodexStatusService';
import type { RunningProcessInfo as DirectRunningProcessInfo } from '../system/RunningProcessInfo';
import type { RunningWindowInfo as DirectRunningWindowInfo } from '../system/RunningWindowInfo';

describe('公共类型导出契约', () => {
  it('所有门面类型与对应定义保持一致', () => {
    expectTypeOf<PublicTypes.IslandPositionOffset>().toEqualTypeOf<DirectIslandPositionOffset>();
    expectTypeOf<PublicTypes.ChunkInfo>().toEqualTypeOf<DirectChunkInfo>();
    expectTypeOf<PublicTypes.DownloadTaskSnapshot>().toEqualTypeOf<DirectDownloadTaskSnapshot>();
    expectTypeOf<PublicTypes.DownloadTaskStatus>().toEqualTypeOf<DirectDownloadTaskStatus>();
    expectTypeOf<PublicTypes.StartDownloadOptions>().toEqualTypeOf<DirectStartDownloadOptions>();
    expectTypeOf<PublicTypes.ClaudeCodeHeatmapDailyCount>().toEqualTypeOf<DirectClaudeCodeHeatmapDailyCount>();
    expectTypeOf<PublicTypes.ClaudeCodeHeatmapDaily>().toEqualTypeOf<DirectClaudeCodeHeatmapDaily>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEvent>().toEqualTypeOf<DirectClaudeCodeHookEvent>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEventKind>().toEqualTypeOf<DirectClaudeCodeHookEventKind>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEventDetailItem>().toEqualTypeOf<DirectClaudeCodeHookEventDetailItem>();
    expectTypeOf<PublicTypes.ClaudeCodeSessionSnapshot>().toEqualTypeOf<DirectClaudeCodeSessionSnapshot>();
    expectTypeOf<PublicTypes.ClaudeCodeSessionPhase>().toEqualTypeOf<DirectClaudeCodeSessionPhase>();
    expectTypeOf<PublicTypes.ClaudeCodeStatusService>().toEqualTypeOf<DirectClaudeCodeStatusService>();
    expectTypeOf<PublicTypes.ClaudeSettingsMutationResult>().toEqualTypeOf<DirectClaudeSettingsMutationResult>();
    expectTypeOf<PublicTypes.PermissionDecision>().toEqualTypeOf<DirectPermissionDecision>();
    expectTypeOf<PublicTypes.ClaudeCodeStatusSnapshot>().toEqualTypeOf<DirectClaudeCodeStatusSnapshot>();
    expectTypeOf<PublicTypes.CodexStatusService>().toEqualTypeOf<DirectCodexStatusService>();
    expectTypeOf<PublicTypes.CodexMonitorMutationResult>().toEqualTypeOf<DirectCodexMonitorMutationResult>();
    expectTypeOf<PublicTypes.RunningProcessInfo>().toEqualTypeOf<DirectRunningProcessInfo>();
    expectTypeOf<PublicTypes.RunningWindowInfo>().toEqualTypeOf<DirectRunningWindowInfo>();
  });
});

describe('主进程门面的合法使用与状态边界', () => {
  it('通过门面构造完整窗口和最小下载配置', () => {
    const fixture: PublicTypes.RunningWindowInfo = { id: '42', title: 'Editor', processName: 'Code.exe', processPath: null, processId: null, iconDataUrl: null };
    expectTypeOf(fixture).toEqualTypeOf<{ id: string; title: string; processName: string; processPath: string | null; processId: number | null; iconDataUrl: string | null }>();
    const download: PublicTypes.StartDownloadOptions = { url: 'https://example.com/fixture', defaultDir: 'C:/fixture' };
    expectTypeOf(download).toEqualTypeOf<{ url: string; defaultDir: string; savePath?: string; threads?: number }>();
    // @ts-expect-error 会话阶段必须采用协议中的四种状态。
    const invalidPhase: PublicTypes.ClaudeCodeSessionPhase = 'busy';
    void invalidPhase;
    // @ts-expect-error 下载线程数必须是数值，门面不得将其放宽到字符串。
    download.threads = 'two';
  });
});
