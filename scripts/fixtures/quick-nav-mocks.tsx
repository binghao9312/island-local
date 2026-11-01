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
 * @file quick-nav-mocks.tsx
 * @description 隔离快速导航测试的应用状态和问卷请求，仅保留真实 Zustand 订阅语义。
 * @author 鸡哥
 */

import { create } from 'zustand';

export const counters = { sectionRenders: 0, questionnaireOpens: 0 };
const useFixtureStore = create(() => ({
  unrelatedTick: 0,
  setQuestionnaire: (): void => { counters.questionnaireOpens += 1; },
}));

export default useFixtureStore;

/**
 * 防止测试依赖问卷组件和账户模块。
 * @returns 不展示问卷。
 */
export function QuestionnaireBanner(): null {
  return null;
}
