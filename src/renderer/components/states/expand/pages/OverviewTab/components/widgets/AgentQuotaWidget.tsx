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
 * @file AgentQuotaWidget.tsx
 * @description expand 总览 Agent 额度小组件，展示 Codex 额度窗口与各来源今日 token，点击标题进入 Agent 用量页。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import { AGENT_QUOTA_FONT_SCALE } from '../../config/overviewConfig';
import { useAgentQuotaSettings } from '../../hooks/useAgentQuotaSettings';
import type { AgentQuotaSettings } from '../../types/overviewTypes';
import {
  AGENT_USAGE_PROVIDER_ICONS,
  FIVE_HOUR_WINDOW_MINUTES,
  WEEKLY_WINDOW_MINUTES,
} from '../../../AgentUsageTab/config/agentUsageConfig';
import {
  effectivePercent,
  findRateLimitWindow,
  formatTokens,
  quotaLevel,
  quotaStatusText,
  resetLabel,
} from '../../../AgentUsageTab/utils/agentUsageUtils';
import type { Translate } from '../../../AgentUsageTab/types/agentUsageTypes';
import type { AgentUsageProviderId, AgentUsageProviderSnapshot, AgentUsageRateLimitWindow, AgentUsageSnapshot } from '../../../../../../../../preload/types/agentUsage';

/** 与 Agent 用量页保持相同刷新节奏。 */
const REFRESH_INTERVAL_MS = 60_000;
/** 首次扫描推迟到展开动画之后，避免与窗口过渡争抢主进程。 */
const START_FETCH_DELAY_MS = 200;
const SKELETON_PROVIDERS: AgentUsageProviderId[] = ['claude', 'codex'];
/** 跨挂载保留最近一次快照，重新展开时直接显示而不是加载态。 */
let cachedSnapshot: AgentUsageSnapshot | null = null;

/**
 * 渲染单个额度窗口行，窗口缺失时显示套餐未提供的提示。
 * @param props - 组件参数
 * @param props.label - 窗口名称
 * @param props.quota - 额度窗口，套餐未提供时为 null
 * @param props.now - 快照生成时间
 * @param props.t - 翻译函数
 * @param props.compact - 为 true 时只显示文字，不渲染进度条
 * @returns 额度行
 */
function QuotaRow({ label, quota, now, t, compact }: { label: string; quota: AgentUsageRateLimitWindow | null; now: number; t: Translate; compact: boolean }): ReactElement {
  if (!quota) {
    return (
      <div className="ov-dash-agent-quota-row">
        <span className="ov-dash-agent-quota-window">{label}</span>
        <span className="ov-dash-agent-quota-hint">{t('expanded.agentUsage.windowMissing')}</span>
      </div>
    );
  }
  const percent = effectivePercent(quota, now);
  const resetText = resetLabel(quota.resetsAt, now, t);
  if (compact) {
    return (
      <div className="ov-dash-agent-quota-row ov-dash-agent-quota-row--compact">
        <span className="ov-dash-agent-quota-window">{label}</span>
        <span className="ov-dash-agent-quota-percent">{`${Math.round(percent)}%`}</span>
        {resetText && <span className="ov-dash-agent-quota-reset">{resetText}</span>}
      </div>
    );
  }
  const level = quotaLevel(percent);
  return (
    <div className="ov-dash-agent-quota-row">
      <span className="ov-dash-agent-quota-window">{label}</span>
      <div className="ov-dash-agent-quota-track">
        <div className={`ov-dash-agent-quota-fill${level ? ` ov-dash-agent-quota-fill--${level}` : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="ov-dash-agent-quota-percent">{`${Math.round(percent)}%`}</span>
      {resetText && <span className="ov-dash-agent-quota-reset">{resetText}</span>}
    </div>
  );
}

/**
 * 渲染单个来源的额度条目。
 * @description 固定展示 5 小时与每周两条额度条，按窗口时长匹配；日志不含额度或目录缺失时展示提示。
 * @param props - 组件参数
 * @param props.provider - 来源快照
 * @param props.now - 快照生成时间
 * @param props.t - 翻译函数
 * @param props.settings - 额度卡片设置，决定强调色与显示样式
 * @returns 来源条目
 */
function ProviderItem({ provider, now, t, settings }: { provider: AgentUsageProviderSnapshot; now: number; t: Translate; settings: AgentQuotaSettings }): ReactElement {
  const compact = settings.style === 'compact';
  const renderBody = (): ReactElement => {
    if (!provider.available) return <span className="ov-dash-agent-quota-hint">{t('expanded.agentUsage.unavailable')}</span>;
    if (!provider.rateLimits) return <span className="ov-dash-agent-quota-hint">{quotaStatusText(provider.quotaStatus, provider.provider, t)}</span>;
    return (
      <>
        <QuotaRow label={t('expanded.agentUsage.window.fiveHour')} quota={findRateLimitWindow(provider.rateLimits, FIVE_HOUR_WINDOW_MINUTES)} now={now} t={t} compact={compact} />
        <QuotaRow label={t('expanded.agentUsage.window.weekly')} quota={findRateLimitWindow(provider.rateLimits, WEEKLY_WINDOW_MINUTES)} now={now} t={t} compact={compact} />
      </>
    );
  };
  return (
    <div
      className={`ov-dash-agent-quota-item ov-dash-agent-quota-item--${provider.provider}`}
      style={{ '--ov-agent-accent': settings.colors[provider.provider] } as CSSProperties}
    >
      <div className="ov-dash-agent-quota-head">
        <img className="ov-dash-agent-quota-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider.provider]} alt="" draggable={false} />
        <span className="ov-dash-agent-quota-name">{t(`expanded.agentUsage.providers.${provider.provider}`)}</span>
        {provider.available && (
          <span className="ov-dash-agent-quota-today" title={t('expanded.agentUsage.todayTokens')}>{formatTokens(provider.today.total)}</span>
        )}
      </div>
      {renderBody()}
    </div>
  );
}

/**
 * 渲染加载骨架，沿用条目布局并保留来源图标。
 * @returns 骨架条目列表
 */
function AgentQuotaSkeleton(): ReactElement {
  return (
    <div className="ov-dash-agent-quota-list ov-dash-agent-quota-skeleton" aria-hidden="true">
      {SKELETON_PROVIDERS.map((provider) => (
        <div key={provider} className={`ov-dash-agent-quota-item ov-dash-agent-quota-item--${provider}`}>
          <div className="ov-dash-agent-quota-head">
            <img className="ov-dash-agent-quota-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider]} alt="" draggable={false} />
            <span className="ov-dash-agent-quota-skeleton-block ov-dash-agent-quota-skeleton-name" />
          </div>
          <span className="ov-dash-agent-quota-skeleton-block ov-dash-agent-quota-skeleton-bar" />
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染 Overview Agent 额度小组件。
 * @description 复用主进程本地日志快照，仅在小组件挂载且窗口可见时每分钟刷新；点击标题切换到 Expand Agent 用量页。
 * @returns Agent 额度小组件
 */
export function AgentQuotaWidget(): ReactElement {
  const { t } = useTranslation();
  const setExpandTab = useIslandStore((store) => store.setExpandTab);
  const [settings] = useAgentQuotaSettings();
  const [snapshot, setSnapshot] = useState<AgentUsageSnapshot | null>(() => cachedSnapshot);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalTimer: number | undefined;
    let inFlight = false;
    const loadSnapshot = async (): Promise<void> => {
      // 上一次扫描未返回时跳过本轮，避免请求堆积。
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const data = await window.api.agentUsageSnapshotGet();
        if (cancelled) return;
        cachedSnapshot = data;
        setSnapshot(data);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        inFlight = false;
      }
    };
    const poll = (): void => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 读取异常已在 loadSnapshot 内处理。
      void loadSnapshot();
    };
    const startPolling = (): void => {
      if (cancelled || intervalTimer !== undefined) return;
      poll();
      intervalTimer = window.setInterval(poll, REFRESH_INTERVAL_MS);
    };
    const stopPolling = (): void => {
      if (intervalTimer === undefined) return;
      window.clearInterval(intervalTimer);
      intervalTimer = undefined;
    };
    const handleVisibilityChange = (): void => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    const delayTimer = window.setTimeout(() => {
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, START_FETCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, []);

  const openAgentUsageTab = useCallback((): void => {
    setExpandTab('agentUsage');
  }, [setExpandTab]);

  const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLSpanElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openAgentUsageTab();
  }, [openAgentUsageTab]);

  const renderBody = (): ReactElement => {
    if (snapshot) {
      return (
        <div className="ov-dash-agent-quota-list">
          {snapshot.providers.map((provider) => (
            <ProviderItem key={provider.provider} provider={provider} now={snapshot.generatedAt} t={t} settings={settings} />
          ))}
        </div>
      );
    }
    if (failed) return <div className="ov-dash-agent-quota-empty">{t('expanded.agentUsage.error')}</div>;
    return <AgentQuotaSkeleton />;
  };

  return (
    <div className="ov-dash-widget ov-dash-agent-quota-widget" style={{ '--ov-agent-quota-scale': AGENT_QUOTA_FONT_SCALE[settings.fontSize] } as CSSProperties}>
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link"
          role="button"
          tabIndex={0}
          onClick={openAgentUsageTab}
          onKeyDown={handleTitleKeyDown}
        >
          {t('overview.agentQuota.title')}
        </span>
      </div>
      {renderBody()}
    </div>
  );
}
