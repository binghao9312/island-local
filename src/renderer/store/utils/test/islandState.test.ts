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
 * @file islandState.test.ts
 * @description 灵动岛状态持久化与回退机制单测
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import { normalizeIslandState } from '../islandState';

describe('normalizeIslandState', () => {
  describe('when SERVER_FEATURES_ENABLED is false (default local-first build)', () => {
    it.each([
      'login',
      'register',
      'resetPassword',
      'setPassword',
      'bindOAuth',
      'bindEmail',
      'payment',
      'questionnaire',
    ] as const)('falls back from hidden cloud state "%s" to "idle"', (hiddenState) => {
      expect(normalizeIslandState(hiddenState)).toBe('idle');
    });

    it.each([
      'idle',
      'hover',
      'expanded',
      'notification',
      'maxExpand',
      'lyrics',
      'lyricsTranslation',
      'guide',
      'agentVoiceInput',
      'agent',
      'stt',
      'cli',
      'musicProvidersLogin',
    ] as const)('preserves supported local state "%s"', (localState) => {
      expect(normalizeIslandState(localState)).toBe(localState);
    });

    it.each([
      null,
      undefined,
      42,
      {},
      [],
      '',
      '   ',
      'unknown-state',
      'corrupted_json',
    ])('falls back from non-string or unknown input %j to "idle"', (input) => {
      expect(normalizeIslandState(input)).toBe('idle');
    });
  });

  describe('when serverFeaturesEnabled is explicitly true (mocked/cloud build)', () => {
    it.each([
      'login',
      'register',
      'resetPassword',
      'setPassword',
      'bindOAuth',
      'bindEmail',
      'payment',
      'questionnaire',
    ] as const)('allows cloud state "%s"', (cloudState) => {
      expect(normalizeIslandState(cloudState, true)).toBe(cloudState);
    });
  });
});
