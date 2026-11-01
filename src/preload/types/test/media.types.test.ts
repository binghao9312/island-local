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
 * @file media.types.test.ts
 * @description media 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { NowPlayingInfo, SmtcSourceInfo, DetectSourceAppIdResult, SmtcTimeline, SmtcTimestampResult, SourceSwitchRequestData } from '../media';
describe('media contracts', () => {
  it('fixes NowPlayingInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<NowPlayingInfo>().toEqualTypeOf<{
      title: string;
      artist: string;
      album: string;
      duration_ms: number;
      position_ms: number;
      positionTimestampMs?: number;
      playbackRate?: number;
      isPlaying: boolean;
      thumbnail?: string | null;
      canFastForward: boolean;
      canSkip: boolean;
      canLike: boolean;
      canChangeVolume: boolean;
      canSetOutput: boolean;
      deviceId?: string;
    }>();
    const fixture: NowPlayingInfo = { title: 'sample', artist: 'sample', album: 'sample', duration_ms: 0, position_ms: 0, isPlaying: false, thumbnail: null, canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false };
    expect(fixture).toBeDefined();
    // @ts-expect-error NowPlayingInfo.title 禁止使用契约外字段值。
    const invalid: NowPlayingInfo['title'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcSourceInfo fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcSourceInfo>().toEqualTypeOf<{
      sourceAppId: string;
      isPlaying: boolean;
      hasTitle: boolean;
      thumbnail: string | null;
    }>();
    const fixture: SmtcSourceInfo = { sourceAppId: 'sample', isPlaying: false, hasTitle: false, thumbnail: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcSourceInfo.sourceAppId 禁止使用契约外字段值。
    const invalid: SmtcSourceInfo['sourceAppId'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes DetectSourceAppIdResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<DetectSourceAppIdResult>().toEqualTypeOf<{
      ok: boolean;
      sources: SmtcSourceInfo[];
      message: string;
    }>();
    const fixture: DetectSourceAppIdResult = { ok: false, sources: [], message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error DetectSourceAppIdResult.ok 禁止使用契约外字段值。
    const invalid: DetectSourceAppIdResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcTimeline fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcTimeline>().toEqualTypeOf<{
      startTime: number;
      endTime: number;
      position: number;
      minSeekTime: number;
      maxSeekTime: number;
      sampledAtMs?: number;
    }>();
    const fixture: SmtcTimeline = { startTime: 0, endTime: 0, position: 0, minSeekTime: 0, maxSeekTime: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcTimeline.startTime 禁止使用契约外字段值。
    const invalid: SmtcTimeline['startTime'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SmtcTimestampResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SmtcTimestampResult>().toEqualTypeOf<{
      isAvailable: boolean;
      playbackStatus: string;
      playbackRate?: number | null;
      sourceAppUserModelId?: string | null;
      timeline: SmtcTimeline | null;
    }>();
    const fixture: SmtcTimestampResult = { isAvailable: false, playbackStatus: 'sample', timeline: null };
    expect(fixture).toBeDefined();
    // @ts-expect-error SmtcTimestampResult.isAvailable 禁止使用契约外字段值。
    const invalid: SmtcTimestampResult['isAvailable'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes SourceSwitchRequestData fields and accepts its explicit legal fixture', () => {
    expectTypeOf<SourceSwitchRequestData>().toEqualTypeOf<{
      sourceAppId: string;
      title: string;
      artist: string;
    }>();
    const fixture: SourceSwitchRequestData = { sourceAppId: 'sample', title: 'sample', artist: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error SourceSwitchRequestData.sourceAppId 禁止使用契约外字段值。
    const invalid: SourceSwitchRequestData['sourceAppId'] = 123;
    expect(invalid).toBeDefined();
  });
});
