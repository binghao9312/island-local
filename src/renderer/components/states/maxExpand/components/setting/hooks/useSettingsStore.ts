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
 * @file useSettingsStore.ts
 * @description 设置页共享 store 与 AI 工作区操作
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';

/**
 * 设置页共享 store 操作。
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsStore() {
  const { fetchWeatherData, setLogin, setRegister, setNotification } = useIslandStore(useShallow((store) => ({
    fetchWeatherData: store.fetchWeatherData,
    setLogin: store.setLogin,
    setRegister: store.setRegister,
    setNotification: store.setNotification,
  })));

  return {
    fetchWeatherData,
    setLogin,
    setRegister,
    setNotification,
  };
}
