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
 * @file ExpandedShapeToggle.tsx
 * @description 展开面板右下角的岛屿形态快速切换按钮（刘海 ↔ 胶囊）。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import type { ReactElement } from 'react';

/**
 * 渲染形态切换按钮；图标显示切换后的目标形态，切换经主进程广播同步到所有窗口。
 * @returns 切换按钮
 */
export function ExpandedShapeToggle(): ReactElement {
  const { t } = useTranslation();
  const shapeMode = useIslandStore((s) => s.shapeMode);
  const target = shapeMode === 'pill' ? 'notch' : 'pill';
  const label = target === 'notch'
    ? t('expanded.shapeToggle.toNotch', { defaultValue: '切换为刘海' })
    : t('expanded.shapeToggle.toPill', { defaultValue: '切换为灵动岛' });

  return (
    <button
      type="button"
      className="expand-shape-toggle"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        window.api.shapeModeSet(target).catch(() => {});
      }}
    >
      {target === 'notch' ? (
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V1" /></svg>
      ) : (
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="16" height="8" rx="4" /></svg>
      )}
    </button>
  );
}
