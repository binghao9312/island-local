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
 * @file islandState.ts
 * @description 灵动岛状态工具与标准化，提供受功能开关保护的状态回退
 * @author 鸡哥
 */

import { SERVER_FEATURES_ENABLED } from '../../../shared/serverFeaturesConfig';
import type { IslandState } from '../types';

/** 依赖云端与账户功能的服务端灵动岛状态表 */
export const SERVER_FEATURE_ISLAND_STATES: Partial<Record<IslandState, true>> = {
  login: true,
  register: true,
  resetPassword: true,
  setPassword: true,
  bindOAuth: true,
  bindEmail: true,
  payment: true,
  questionnaire: true,
};

/** 全部合法灵动岛状态表 */
export const ALL_ISLAND_STATES: Record<IslandState, true> = {
  idle: true,
  hover: true,
  expanded: true,
  notification: true,
  maxExpand: true,
  lyrics: true,
  lyricsTranslation: true,
  guide: true,
  login: true,
  register: true,
  resetPassword: true,
  setPassword: true,
  bindOAuth: true,
  bindEmail: true,
  payment: true,
  questionnaire: true,
  cli: true,
  musicProvidersLogin: true,
};

/**
 * 校验并标准化灵动岛状态，处理持久化或外部传入状态的回退。
 * @param state - 待校验的原始状态值
 * @param serverFeaturesEnabled - 是否启用云端与账户功能，默认读取 SERVER_FEATURES_ENABLED
 * @returns 合法且启用的灵动岛状态；若为禁用或损坏状态则安全回退到 'idle'
 */
export function normalizeIslandState(
  state: unknown,
  serverFeaturesEnabled: boolean = SERVER_FEATURES_ENABLED,
): IslandState {
  if (typeof state !== 'string') {
    return 'idle';
  }
  const candidate = state.trim() as IslandState;
  if (!serverFeaturesEnabled && SERVER_FEATURE_ISLAND_STATES[candidate]) {
    return 'idle';
  }
  if (ALL_ISLAND_STATES[candidate]) {
    return candidate;
  }
  return 'idle';
}
