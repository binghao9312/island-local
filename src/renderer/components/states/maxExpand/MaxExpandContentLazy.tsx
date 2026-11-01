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
 * @file MaxExpandContentLazy.tsx
 * @description MaxExpand 性能模式懒加载内容实现。
 * @author 鸡哥
 */

import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import type { MaxExpandTab } from '../../../store/types';
import { MaxExpandContentShell } from './MaxExpandContentShell';

const AcpChatTab = lazy(() => import('./components/acpChat').then((module) => ({ default: module.AcpChatTab })));
const SettingsTab = lazy(() => import('./components/setting').then((module) => ({ default: module.SettingsTab })));

function renderLazyActiveTab(activeTab: MaxExpandTab, loadingFallback: ReactElement, contentReady: boolean): ReactElement | null {
  if (!contentReady) return loadingFallback;
  let content: ReactElement | null = null;
  if (activeTab === 'aiChat') content = <AcpChatTab />;
  if (activeTab === 'settings') content = <SettingsTab />;
  return <Suspense fallback={loadingFallback}>{content}</Suspense>;
}

/**
 * 渲染 MaxExpand 的懒加载内容（性能模式）。
 */
export function MaxExpandContentLazy(): ReactElement {
  return <MaxExpandContentShell renderActiveTab={renderLazyActiveTab} performanceModeEnabled />;
}
