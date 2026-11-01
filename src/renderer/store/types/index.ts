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
 * @file index.ts
 * @description 灵动岛 Store 类型定义
 * @author 鸡哥
 */

import type { LocationInfo } from '../../api/weather/locationApi';
import type { WeatherApiConfig } from '../../api/weather/types/WeatherApiConfig';
import type { TranslationLyricsResult } from '../../api/lyrics/lrcApi';

export type { WeatherApiConfig };

/** 灵动岛 UI 状态枚举 */
export type IslandState = 'idle' | 'hover' | 'expanded' | 'notification' | 'maxExpand' | 'lyrics' | 'lyricsTranslation' | 'guide' | 'login' | 'register' | 'resetPassword' | 'setPassword' | 'bindOAuth' | 'bindEmail' | 'payment' | 'questionnaire' | 'questionnaire' | 'cli' | 'musicProvidersLogin';

/** 灵动岛动画速度档位 */
export type AnimationSpeed = 'slow' | 'medium' | 'fast';

/** 灵动岛形态模式 */
export type IslandShapeMode = 'notch' | 'pill';

/** Hover 状态下的子标签页类型 */
export type HoverTab = 'time' | 'lyrics' | 'weather' | 'expand';

/** Expanded 状态下的子标签页类型 */
export type ExpandTab = 'hover' | 'overview' | 'song' | 'tools' | 'performanceMonitor' | 'agentUsage' | 'calendar';

/** CLI 活动提供方 */
export type CliProvider = 'claude' | 'codex';

/** MaxExpand 状态下的子标签页类型 */
export type MaxExpandTab = 'aiChat' | 'settings';

/** 歌词显示模式 */
export type LrcMode = 'off' | 'info' | 'lrc';

/** 单行歌词数据类型 */
export interface LyricLine {
  text: string;
  is_current: boolean;
}

/** 逐字音节(可选), 由 karaoke 歌词源产出 */
export interface SyncedLyricSyllable {
  /** 相对于行首的起始偏移(毫秒) */
  start_offset_ms: number;
  /** 音节持续时长(毫秒) */
  duration_ms: number;
  /** 音节文本 */
  text: string;
}

/** 同步歌词行(来自 lrcApi / karaoke) */
export interface SyncedLyricLine {
  time_ms: number;
  text: string;
  /** 行持续时长(毫秒), 0 或缺省表示未知 */
  duration_ms?: number;
  /** 逐字音节数组, 存在且非空则启用逐字扫光渲染 */
  syllables?: SyncedLyricSyllable[];
}

/** 媒体信息数据类型 */
export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
}

/** NowPlaying 原始数据结构（来自 @eisland/windows-smtc-helper SmtcMonitor） */
export type NowPlayingInfo = {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  position_ms: number;
  /** position_ms 对应的 Unix 毫秒时间，用于补偿跨进程传输延迟。 */
  positionTimestampMs?: number;
  playbackRate?: number;
  isPlaying: boolean;
  thumbnail?: string | null;
  canFastForward: boolean;
  canSkip: boolean;
  canLike: boolean;
  canChangeVolume: boolean;
  canSetOutput: boolean;
  deviceId?: string;
};

/** 歌词更新数据（后端推送的格式） */
export interface LrcUpdateData {
  text: string | null;
  title: string;
  artist: string;
  position_ms?: number;
  duration_ms?: number;
  nearby_lyrics?: LyricLine[];
}

/** 媒体变化数据 */
export interface MediaChangedData {
  title: string;
  artist: string;
  thumbnail?: string | null;
  duration_ms?: number;
}

/** 番茄钟阶段 */
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

/** 倒计时数据类型 */
export interface CountdownConfig {
  targetDate: string;
  label: string;
  enabled: boolean;
}

/** 单日天气预报数据类型 */
export interface DayForecast {
  temperature: number;
  description: string;
  temperatureMax: number;
  temperatureMin: number;
  windSpeed: number;
  uvIndex: number;
  precipitationProbability: number;
  iconCode: number;
}

/** 天气数据类型定义 */
export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  /** 当前降雨机率（%）；缺测为 -1，旧缓存可能缺失 */
  precipitationProbability?: number;
  forecast: [DayForecast, DayForecast];
  iconCode: number;
}

/** 计时器状态类型 */
export type TimerState = 'idle' | 'running' | 'paused';

/** 计时器数据接口 */
export interface TimerData {
  state: TimerState;
  remainingSeconds: number;
  /** 本次倒计时启动时的总秒数，供灵动岛进度环计算比例；idle 时为 0 */
  totalSeconds: number;
  inputHours: string;
  inputMinutes: string;
  inputSeconds: string;
}

/** 通知数据类型 */
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  /** 通知类型：默认通知 / 播放源切换请求 / 有新版本 / 更新下载中 / 更新就绪 / 启动天气预警 / 剪贴板URL / 重启确认 / 外部Agent启动 / 外部Agent关闭 / 检测到 Claude Code 流事件 */
  type?: 'default' | 'source-switch' | 'update-available' | 'update-downloading' | 'update-ready' | 'clipboard-url' | 'restart-required' | 'external-agent-active' | 'external-agent-stopped' | 'cli-session-detected' | 'mail';
  /** 检测到 CLI session 时应切换到的提供方 */
  cliProvider?: CliProvider;
  /** 外部 Agent 名称（仅 external-agent-active / external-agent-stopped 类型） */
  agentName?: string;
  /** 请求切换到的播放源 ID（仅 source-switch 类型） */
  sourceAppId?: string;
  /** 更新版本号（用于 update-available 与 update-ready 类型） */
  updateVersion?: string;
  /** 当前更新源展示文案（用于 update-available 类型） */
  updateSourceLabel?: string;
  /** 检测到的 URL 列表（仅 clipboard-url 类型） */
  urls?: string[];
  /** 休息提醒条目 ID（仅默认通知中由休息提醒触发时使用） */
  breakReminderItemId?: string;
  /** 新邮件打开链接（仅 mail 类型） */
  mailUrl?: string;
}

// ============= Slice Interfaces =============

export type PaymentContext =
  | { type: 'pro' }
  | { type: 'recharge'; amountFen: number };

/** 设置密码上下文（OAuth 新用户注册） */
export interface SetPasswordContext {
  tempToken: string;
  suggestedUsername: string;
  email: string;
}

/** 绑定 OAuth 上下文（已有邮箱账号绑定第三方登录） */
export interface BindOAuthContext {
  tempToken: string;
  username: string;
  email: string;
}

/** 绑定邮箱上下文（OAuth 新用户绑定邮箱） */
export interface BindEmailContext {
  tempToken: string;
  suggestedUsername: string;
}

/** 岛屿状态 Slice */
export interface IslandSlice {
  state: IslandState;
  authReturnState: IslandState | null;
  uiStateLocked: boolean;
  hoverTab: HoverTab;
  expandTab: ExpandTab;
  /** 性能监控是否被固定为常驻（仅会话内有效，不持久化）。 */
  performanceMonitorPinned: boolean;
  maxExpandTab: MaxExpandTab;
  maxExpandAppModeEnabled: boolean;
  /** 应用化模式下显示导航页，保留最后选择的应用供传统模式恢复。 */
  maxExpandLauncherVisible: boolean;
  cliProvider: CliProvider;
  notification: NotificationData;

  springAnimation: boolean;
  animationSpeed: AnimationSpeed;
  shapeMode: IslandShapeMode;
  setIdle: (force?: boolean) => void;
  setHover: () => void;
  setExpanded: () => void;
  setMaxExpand: () => void;
  setLogin: () => void;
  setRegister: () => void;
  paymentContext: PaymentContext;
  setPayment: (context?: PaymentContext) => void;
  setPasswordContext: SetPasswordContext;
  setSetPassword: (context: SetPasswordContext) => void;
  bindOAuthContext: BindOAuthContext;
  setBindOAuth: (context: BindOAuthContext) => void;
  bindEmailContext: BindEmailContext;
  setBindEmail: (context: BindEmailContext) => void;
  musicProviderLogin: 'qishui';
  setMusicProvidersLogin: (provider?: 'qishui') => void;
  returnFromAuth: () => void;
  setLyrics: () => void;
  setLyricsTranslation: () => void;
  /** 收起状态是否允许自动显示歌词行（设置项 music:lyrics-idle-display-enabled 的镜像） */
  lyricsIdleDisplayEnabled: boolean;
  setLyricsIdleDisplayEnabled: (enabled: boolean) => void;
  setNotification: (data: NotificationData) => void;

  setGuide: () => void;
  setQuestionnaire: () => void;
  setCli: () => void;
  toggleUiStateLock: () => boolean;
  setHoverTab: (tab: HoverTab) => void;
  setExpandTab: (tab: ExpandTab) => void;
  /** 固定或取消固定性能监控；仅在展开态性能监控页内允许固定。 */
  setPerformanceMonitorPinned: (pinned: boolean) => void;
  setMaxExpandTab: (tab: MaxExpandTab) => void;
  showMaxExpandLauncher: () => void;
  setCliProvider: (provider: CliProvider) => void;
  setSpringAnimation: (enabled: boolean) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setShapeMode: (mode: IslandShapeMode) => void;
}

/** 天气请求状态：ok 成功；no-key 未设置 CWA 授权码；invalid-key 授权码被拒；out-of-region 位置不在台湾；error 其他失败 */
export type WeatherStatus = 'ok' | 'no-key' | 'invalid-key' | 'out-of-region' | 'error';

/** 天气 Slice */
export interface WeatherSlice {
  weather: WeatherData;
  /** 最近一次天气请求的状态，供界面显示空状态与提示。 */
  weatherStatus: WeatherStatus;
  location: LocationInfo | null;
  /** 共用定位策略、缓存及并发请求，不触发天气查询。 */
  refreshLocation: (forceRefresh?: boolean) => Promise<LocationInfo | null>;
  setWeather: (data: WeatherData) => void;
  /** 请求并保存天气数据，返回本次请求的状态。 */
  fetchWeatherData: (config?: WeatherApiConfig, forceRefresh?: boolean) => Promise<WeatherStatus>;
}

/** 计时器 Slice */
export interface TimerSlice {
  countdown: CountdownConfig;
  timerData: TimerData;
  setCountdown: (config: Partial<CountdownConfig>) => void;
  setTimerData: (data: Partial<TimerData>) => void;
}

/** 通知 Slice */
export interface NotificationSlice {
  notification: NotificationData;
}

/** 媒体/音乐 Slice */
export interface MediaSlice {
  isMusicPlaying: boolean;
  isPlaying: boolean;
  lrcMode: LrcMode;
  currentDurationMs: number;
  currentPositionMs: number;
  currentLyricText: string | null;
  mediaInfo: MediaInfo;
  nearbyLyrics: LyricLine[];
  coverImage: string | null;
  dominantColor: [number, number, number];
  syncedLyrics: SyncedLyricLine[] | null;
  translationLyrics: TranslationLyricsResult | null;
  lyricsLoading: boolean;
  updateLrcData: (data: LrcUpdateData | null) => void;
  onMediaChanged: (data: MediaChangedData) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setLrcMode: (mode: LrcMode) => void;
  updateProgress: (position_ms: number) => void;
  setCoverImage: (cover: string | null) => void;
  setDominantColor: (color: [number, number, number]) => void;
  handleNowPlayingUpdate: (info: NowPlayingInfo | null) => void;
  setSyncedLyrics: (lyrics: SyncedLyricLine[] | null) => void;
  setTranslationLyrics: (translation: TranslationLyricsResult | null) => void;
  setLyricsLoading: (loading: boolean) => void;
}

/** 番茄钟 Slice */
export interface PomodoroSlice {
  pomodoroPhase: PomodoroPhase;
  pomodoroRemaining: number;
  pomodoroRunning: boolean;
  pomodoroCompletedCount: number;
  setPomodoroPhase: (phase: PomodoroPhase) => void;
  setPomodoroRemaining: (remaining: number) => void;
  setPomodoroRunning: (running: boolean) => void;
  setPomodoroCompletedCount: (count: number) => void;
}

/** 完整 Store 类型 */
export type IIslandStore = IslandSlice & WeatherSlice & TimerSlice & MediaSlice & PomodoroSlice;
