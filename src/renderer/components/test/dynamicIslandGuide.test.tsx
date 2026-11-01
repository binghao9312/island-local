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
 * @file dynamicIslandGuide.test.tsx
 * @description 验证引导入口挂载、完整步骤渲染、前进返回、跳过和完成流程。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, type ReactElement } from 'react';
import { nodes, render, trigger, value } from '../states/maxExpand/test/componentHarness';
import { GUIDE_STEP_TOTAL, GUIDE_STEPS, type GuideStep } from '../../types/DynamicIslandGuideTypes';

const mocks = vi.hoisted(() => ({
  root: {}, get: vi.fn<() => object | null>(), mount: vi.fn(), render: vi.fn(), send: vi.fn(),
  steps: Array.from({ length: 10 }, () => () => null), wave: () => null, indicator: () => null,
}));
vi.mock('react-dom/client', () => ({ createRoot: mocks.mount }));
vi.mock('../components/DynamicIslandSharedWaveEffect', () => ({ WaveEffect: mocks.wave }));
vi.mock('../components/DynamicIslandProcessIndicator', () => ({ ProcessIndicator: mocks.indicator }));
vi.mock('../components/DynamicIslandGuidePages/smtc-test/hooks/useSmtcAccentColor', () => ({ useSmtcAccentColor: () => '#abcdef' }));
vi.mock('../components/DynamicIslandGuidePages/language', () => ({ LanguageStep: mocks.steps[0] }));
vi.mock('../components/DynamicIslandGuidePages/smtc-white-list', () => ({ WhitelistStep: mocks.steps[1] }));
vi.mock('../components/DynamicIslandGuidePages/smtc-test', () => ({ SmtcStep: mocks.steps[2] }));
vi.mock('../components/DynamicIslandGuidePages/theme', () => ({ ThemeStep: mocks.steps[3] }));
vi.mock('../components/DynamicIslandGuidePages/shape', () => ({ ShapeStep: mocks.steps[4] }));
vi.mock('../components/DynamicIslandGuidePages/lyric-mode', () => ({ LyricModeStep: mocks.steps[5] }));
vi.mock('../components/DynamicIslandGuidePages/update', () => ({ UpdateStep: mocks.steps[6] }));
vi.mock('../components/DynamicIslandGuidePages/github', () => ({ GithubStep: mocks.steps[7] }));
vi.mock('../components/DynamicIslandGuidePages/sponsors', () => ({ SponsorStep: mocks.steps[8] }));
vi.mock('../components/DynamicIslandGuidePages/welcome', () => ({ WelcomeStep: mocks.steps[9] }));

/** 引导步骤到其 mock 组件的映射 */
const STEP_MOCKS: Record<GuideStep, () => null> = {
  language: mocks.steps[0], whitelist: mocks.steps[1], smtc: mocks.steps[2], theme: mocks.steps[3],
  shape: mocks.steps[4], lyricMode: mocks.steps[5], update: mocks.steps[6], github: mocks.steps[7],
  sponsors: mocks.steps[8], welcome: mocks.steps[9],
};

/**
 * 从真实入口的挂载树取得内部引导组件。
 * @returns 被挂载的实际组件引用。
 */
function guide(): unknown {
  const tree = mocks.render.mock.calls[0][0] as ReactElement<{ children: ReactElement }>;
  return tree.props.children.type;
}

describe('DynamicIslandGuide', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.get.mockReturnValue(mocks.root);
    mocks.mount.mockReturnValue({ render: mocks.render });
    vi.stubGlobal('document', { getElementById: mocks.get });
    vi.stubGlobal('window', { electron: { ipcRenderer: { send: mocks.send } } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('挂载StrictMode引导，波浪使用主题色且进度从第一步开始', async () => {
    await import('../DynamicIslandGuide');
    expect(mocks.get).toHaveBeenCalledWith('root');
    expect(mocks.mount).toHaveBeenCalledWith(mocks.root);
    expect((mocks.render.mock.calls[0][0] as ReactElement).type).toBe(StrictMode);
    const tree = render(guide());
    expect(nodes(tree, mocks.steps[0])).toHaveLength(1);
    expect(value(tree, mocks.wave, 'accentColor')).toBe('#abcdef');
    expect(value(tree, mocks.indicator, 'total')).toBe(GUIDE_STEP_TOTAL);
    expect(value(tree, mocks.indicator, 'current')).toBe(0);
  });

  it('更新检测关闭时步骤序列不含更新源步骤，总数与进度点保持一致', () => {
    expect(GUIDE_STEPS).not.toContain('update');
    expect(GUIDE_STEPS).toEqual(['language', 'whitelist', 'smtc', 'theme', 'shape', 'lyricMode', 'github', 'sponsors', 'welcome']);
    expect(GUIDE_STEP_TOTAL).toBe(9);
  });

  it('遍历全部实际步骤渲染和前进回退（跳过更新源步骤），最终完成发送IPC', async () => {
    await import('../DynamicIslandGuide');
    const app = guide();
    GUIDE_STEPS.slice(0, -1).forEach((key, index) => {
      const step = STEP_MOCKS[key];
      let tree = render(app);
      expect(nodes(tree, step)).toHaveLength(1);
      expect(nodes(tree, STEP_MOCKS.update)).toHaveLength(0);
      expect(value(tree, mocks.indicator, 'current')).toBe(index);
      trigger(tree, step, 'onNext');
      tree = render(app);
      const next = STEP_MOCKS[GUIDE_STEPS[index + 1]];
      expect(nodes(tree, next)).toHaveLength(1);
      expect(nodes(tree, STEP_MOCKS.update)).toHaveLength(0);
      trigger(tree, next, 'onPrev');
      expect(nodes(render(app), step)).toHaveLength(1);
      trigger(render(app), step, 'onNext');
    });
    const finalTree = render(app);
    expect(nodes(finalTree, STEP_MOCKS.welcome)).toHaveLength(1);
    expect(value(finalTree, mocks.indicator, 'current')).toBe(GUIDE_STEP_TOTAL - 1);
    trigger(finalTree, STEP_MOCKS.welcome, 'onComplete');
    expect(mocks.send).toHaveBeenCalledWith('guide:complete');
  });

  it('歌词模式步骤的下一步直接进入开源信息，开源信息返回歌词模式', async () => {
    await import('../DynamicIslandGuide');
    const app = guide();
    GUIDE_STEPS.slice(0, GUIDE_STEPS.indexOf('lyricMode')).forEach((key) => trigger(render(app), STEP_MOCKS[key], 'onNext'));
    trigger(render(app), STEP_MOCKS.lyricMode, 'onNext');
    expect(nodes(render(app), STEP_MOCKS.github)).toHaveLength(1);
    trigger(render(app), STEP_MOCKS.github, 'onPrev');
    expect(nodes(render(app), STEP_MOCKS.lyricMode)).toHaveLength(1);
  });

  it('首步跳过直接结束引导', async () => {
    await import('../DynamicIslandGuide');
    trigger(render(guide()), mocks.steps[0], 'onSkip');
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith('guide:complete');
  });

  it('缺失root时阻止挂载并明确报告引导入口错误', async () => {
    mocks.get.mockReturnValue(null);
    await expect(import('../DynamicIslandGuide')).rejects.toThrow('[GuideRenderer] 未找到 #root 挂载节点');
    expect(mocks.mount).not.toHaveBeenCalled();
  });
});
