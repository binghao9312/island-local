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
 * @file ExpandedNavDots.tsx
 * @description 展开面板底部正中间的导航点。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { getNavLabel } from '../utils/getNavLabel';
import type { ReactElement } from 'react';
import type { ExpandedNavDotsProps } from '../types/expandTypes';

/**
 * 渲染导航点，当前页高亮。
 * @param props - 组件入参
 * @param props.navDots - 导航点序列
 * @param props.expandTab - 当前页
 * @param props.onNavDotClick - 导航点点击回调
 * @returns 导航点容器
 */
export function ExpandedNavDots({ navDots, expandTab, onNavDotClick }: ExpandedNavDotsProps): ReactElement {
  const { t } = useTranslation();
  const index = navDots.indexOf(expandTab);
  const prevTab = index > 0 ? navDots[index - 1] : undefined;
  const nextTab = index >= 0 && index < navDots.length - 1 ? navDots[index + 1] : undefined;
  return (
    <div className="expand-nav-dots" onClick={(e) => e.stopPropagation()}>
      <button
        className="expand-nav-arrow"
        disabled={prevTab === undefined}
        onClick={() => prevTab !== undefined && onNavDotClick(prevTab)}
        aria-label={t('expanded.nav.previousPage', { defaultValue: 'Previous page' })}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 1.5 3 5l3.5 3.5" /></svg>
      </button>
      {navDots.map((tab) => (
        <button
          key={tab}
          className={`expand-nav-dot ${expandTab === tab ? 'active' : ''}`}
          onClick={() => onNavDotClick(tab)}
          title={getNavLabel(tab, t)}
          aria-label={t('expanded.nav.switchToPage', { defaultValue: '切换到{{label}}页面', label: getNavLabel(tab, t) })}
        />
      ))}
      <button
        className="expand-nav-arrow"
        disabled={nextTab === undefined}
        onClick={() => nextTab !== undefined && onNavDotClick(nextTab)}
        aria-label={t('expanded.nav.nextPage', { defaultValue: 'Next page' })}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 1.5 7 5 3.5 8.5" /></svg>
      </button>
    </div>
  );
}
