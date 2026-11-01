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
 * @file MaxExpandContentEager.tsx
 * @description MaxExpand 非性能模式（旧版一次性加载）内容实现。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MaxExpandTab } from '../../../store/types';
import { MaxExpandContentShell } from './MaxExpandContentShell';
import { AcpChatTab } from './components/acpChat';
import { SettingsTab } from './components/setting';

function renderEagerActiveTab(activeTab: MaxExpandTab, loadingFallback: ReactElement, contentReady: boolean): ReactElement | null {
  if (!contentReady) return loadingFallback;
  if (activeTab === 'aiChat') return <AcpChatTab />;
  if (activeTab === 'settings') return <SettingsTab />;
  return null;
}

/**
 * 渲染 MaxExpand 的旧版一次性加载内容（非性能模式）。
 */
export function MaxExpandContentEager(): ReactElement {
  return <MaxExpandContentShell renderActiveTab={renderEagerActiveTab} deferContent={false} />;
}
