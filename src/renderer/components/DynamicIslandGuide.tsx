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
 * @file DynamicIslandGuide.tsx
 * @description 引导配置窗口 React 渲染入口
 * @description 首次启动时引导用户完成基础配置，splash 动画结束后通过
 *   FIRST_LAUNCH_STORE_KEY 判断是否进入配置界面（dev 模式下默认进入）
 * @author 鸡哥
 */

import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/guide.css';
import { GUIDE_STEP_INDEX, GUIDE_STEP_TOTAL, GUIDE_STEPS, getAdjacentGuideStep } from '../types/DynamicIslandGuideTypes';
import { WaveEffect } from './components/DynamicIslandSharedWaveEffect';
import { LanguageStep } from './components/DynamicIslandGuidePages/language';
import { WhitelistStep } from './components/DynamicIslandGuidePages/smtc-white-list';
import { SmtcStep } from './components/DynamicIslandGuidePages/smtc-test';
import { ThemeStep } from './components/DynamicIslandGuidePages/theme';
import { ShapeStep } from './components/DynamicIslandGuidePages/shape';
import { LyricModeStep } from './components/DynamicIslandGuidePages/lyric-mode';
import { UpdateStep } from './components/DynamicIslandGuidePages/update';
import { GithubStep } from './components/DynamicIslandGuidePages/github';
import { SponsorStep } from './components/DynamicIslandGuidePages/sponsors';
import { WelcomeStep } from './components/DynamicIslandGuidePages/welcome';
import { ProcessIndicator } from './components/DynamicIslandProcessIndicator';
import { useSmtcAccentColor } from './components/DynamicIslandGuidePages/smtc-test/hooks/useSmtcAccentColor';
import type { ReactElement } from 'react';
import type { GuideStep } from '../types/DynamicIslandGuideTypes';

/** 引导窗口根组件 */
function GuideApp(): ReactElement {
  const [step, setStep] = useState<GuideStep>('language');
  const accentColor = useSmtcAccentColor();

  /** 通知主进程引导完成，关闭引导窗口并显示主窗口 */
  const handleComplete = useCallback((): void => {
    window.electron.ipcRenderer.send('guide:complete');
  }, []);

  /** 前进到步骤序列中的下一步（更新检测关闭时序列不含更新源步骤） */
  const handleNext = useCallback((): void => {
    setStep((current) => getAdjacentGuideStep(GUIDE_STEPS, current, 1));
  }, []);

  /** 返回步骤序列中的上一步 */
  const handlePrev = useCallback((): void => {
    setStep((current) => getAdjacentGuideStep(GUIDE_STEPS, current, -1));
  }, []);

  return (
    <div className="guide-container">
      <WaveEffect accentColor={accentColor} />
      <div className="guide-content">
        <div className="guide-process-indicator">
          <ProcessIndicator total={GUIDE_STEP_TOTAL} current={GUIDE_STEP_INDEX[step] ?? 0} />
        </div>
        {step === 'language' && (
          <LanguageStep
            onNext={handleNext}
            onSkip={handleComplete}
          />
        )}
        {step === 'whitelist' && (
          <WhitelistStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'smtc' && (
          <SmtcStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'theme' && (
          <ThemeStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'shape' && (
          <ShapeStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'lyricMode' && (
          <LyricModeStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'update' && (
          <UpdateStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'github' && (
          <GithubStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'sponsors' && (
          <SponsorStep
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 'welcome' && (
          <WelcomeStep
            onComplete={handleComplete}
            onPrev={handlePrev}
          />
        )}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('[GuideRenderer] 未找到 #root 挂载节点');
}

createRoot(root).render(
  <StrictMode>
    <GuideApp />
  </StrictMode>
);
