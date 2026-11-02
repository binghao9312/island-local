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
 * @file googleCalendarService.ts
 * @description Google 日历服务：通过用户已登录的 gws CLI 读写日历。eIsland 不实现 OAuth，也不保存任何凭据。
 * @author 鸡哥
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { delimiter, join } from 'path';
import type {
  GoogleCalendarErrorCode,
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleCalendarRange,
  GoogleCalendarStatus,
} from '../../shared/googleCalendarTypes';

/** gws 子进程超时时间；超时视为网络或服务不可用 */
const GWS_TIMEOUT_MS = 20_000;
/** 单次查询的事件上限，与 gws 默认分页一致 */
const LIST_MAX_RESULTS = 250;
/** 事件 ID 只允许 Google 生成的字符集，避免拼接进请求路径时注入路径段 */
const EVENT_ID_PATTERN = /^[A-Za-z0-9_@.-]{1,1024}$/;
/** 日历 ID 允许邮箱、群组日历（@group.calendar.google.com）及含 # 的系统日历（节假日、联系人生日） */
const CALENDAR_ID_PATTERN = /^[A-Za-z0-9_@.#-]{1,1024}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
/** 日历颜色缺失或非法时的回退色（Google 品牌蓝） */
const FALLBACK_EVENT_COLOR = '#4285f4';
/** 有写权限的日历角色；其余角色（reader、freeBusyReader）只读 */
const WRITABLE_ACCESS_ROLES = new Set(['owner', 'writer']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TITLE_LENGTH = 1024;

/** 业务错误，携带可映射到界面文案的错误类别 */
export class GoogleCalendarError extends Error {
  code: GoogleCalendarErrorCode;

  /**
   * @param code - 错误类别
   * @param message - 面向日志的英文说明，不包含事件标题或凭据
   */
  constructor(code: GoogleCalendarErrorCode, message: string) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.code = code;
  }
}

/**
 * 判断值是否为普通对象
 * @param value - 任意值
 * @returns 是否为非空对象（数组除外）
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 读取 ~/.omp/agent/mcp.json 中 google-workspace 配置的 GWS_BIN
 * @returns 配置的可执行文件路径；文件缺失或字段为空时返回 null
 */
function readConfiguredBinary(): string | null {
  try {
    const raw = readFileSync(join(homedir(), '.omp', 'agent', 'mcp.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { mcpServers?: Record<string, { env?: Record<string, unknown> }> };
    const bin = parsed.mcpServers?.['google-workspace']?.env?.GWS_BIN;
    return typeof bin === 'string' && bin.trim() ? bin.trim() : null;
  } catch {
    return null;
  }
}

/**
 * 定位 gws 可执行文件
 * @description 优先使用 mcp.json 中配置的 GWS_BIN，其次在 PATH 中查找 gws.exe。
 * 不查找 .cmd 包装脚本：无 shell 方式无法直接启动批处理文件。
 * @returns 可执行文件的绝对路径；未找到时返回 null
 */
export function resolveGwsBinary(): string | null {
  const configured = readConfiguredBinary();
  if (configured && existsSync(configured)) return configured;
  const names = process.platform === 'win32' ? ['gws.exe'] : ['gws'];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    // npm 全局安装只在 PATH 放 .cmd 包装脚本，真正的 gws.exe 位于同一前缀下的包目录
    if (process.platform === 'win32') {
      const npmPackaged = join(dir, 'node_modules', '@googleworkspace', 'cli', 'bin', 'gws.exe');
      if (existsSync(npmPackaged)) return npmPackaged;
    }
  }
  return null;
}

/**
 * 根据 gws 的失败输出推断错误类别
 * @param output - stdout 与 stderr 合并后的文本，仅用于匹配关键字，不会原样外泄
 * @returns 错误类别
 */
function classifyFailure(output: string): GoogleCalendarErrorCode {
  if (/auth|login|credential|token|401/i.test(output)) return 'not-logged-in';
  if (/network|dns|connect|unreachable|offline|ENOTFOUND|ECONN/i.test(output)) return 'network';
  return 'unknown';
}

/**
 * 以无 shell 方式执行 gws 并解析输出的 JSON
 * @description gws 可能在 JSON 之前输出 "Using keyring backend" 等提示行，因此从第一个 { 或 [ 开始解析；
 * 空输出（如删除成功）解析为 null。
 * @param args - gws 子命令与参数数组
 * @returns 解析后的 JSON 值，空输出时为 null
 */
function runGws(args: string[]): Promise<unknown> {
  const bin = resolveGwsBinary();
  if (!bin) return Promise.reject(new GoogleCalendarError('gws-missing', 'gws CLI was not found'));
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: GWS_TIMEOUT_MS,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(error.code === 'ENOENT'
        ? new GoogleCalendarError('gws-missing', 'gws CLI was not found')
        : new GoogleCalendarError('unknown', 'gws CLI could not be started'));
    });
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new GoogleCalendarError('network', 'gws CLI timed out'));
        return;
      }
      if (code !== 0) {
        reject(new GoogleCalendarError(classifyFailure(`${stderr}\n${stdout}`), `gws exited with code ${code}`));
        return;
      }
      if (!stdout.trim()) {
        resolve(null);
        return;
      }
      const start = stdout.search(/[{[]/);
      if (start < 0) {
        reject(new GoogleCalendarError('unknown', 'gws output contained no JSON'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.slice(start)) as unknown);
      } catch {
        reject(new GoogleCalendarError('unknown', 'gws output could not be parsed'));
      }
    });
  });
}

/**
 * 将 YYYY-MM-DD 日期键平移指定天数（按 UTC 计算，避免夏令时影响）
 * @param dateKey - 日期键 YYYY-MM-DD
 * @param days - 平移天数，可为负
 * @returns 平移后的日期键
 */
function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 事件所属日历的展示信息 */
interface CalendarSource {
  calendarId: string;
  color: string;
  readOnly: boolean;
}

/** 新建事件固定写入主日历，主日历必然可写 */
const PRIMARY_SOURCE: CalendarSource = { calendarId: 'primary', color: FALLBACK_EVENT_COLOR, readOnly: false };

/**
 * 将 gws 返回的 Google 事件转换为渲染进程使用的结构
 * @param item - Google Calendar Event 资源
 * @param source - 事件所属日历的 ID、颜色与读写权限
 * @returns 规范化事件；无 ID 或无起止时间时返回 null
 */
function toEvent(item: Record<string, unknown>, source: CalendarSource): GoogleCalendarEvent | null {
  const id = typeof item.id === 'string' ? item.id : '';
  if (!id) return null;
  const start = isRecord(item.start) ? item.start : {};
  const end = isRecord(item.end) ? item.end : {};
  const title = typeof item.summary === 'string' ? item.summary : '';
  if (typeof start.date === 'string') {
    // Google 全天事件的 end.date 是开区间，这里转换为包含当日的结束日。
    const last = typeof end.date === 'string' ? shiftDateKey(end.date, -1) : start.date;
    return { id, ...source, title, allDay: true, start: start.date, end: last < start.date ? start.date : last };
  }
  if (typeof start.dateTime === 'string') {
    return {
      id,
      ...source,
      title,
      allDay: false,
      start: start.dateTime,
      end: typeof end.dateTime === 'string' ? end.dateTime : start.dateTime,
    };
  }
  return null;
}

/**
 * 校验并规范化渲染进程传入的事件输入
 * @description IPC 入参来自渲染进程，类型与范围全部在此再次校验。
 * @param raw - 未受信任的输入对象
 * @returns 规范化后的输入
 * @throws GoogleCalendarError 字段缺失、格式错误或时间顺序错误时抛出 invalid-input
 */
export function normalizeEventInput(raw: unknown): GoogleCalendarEventInput {
  if (!isRecord(raw)) throw new GoogleCalendarError('invalid-input', 'event input must be an object');
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date : '';
  const allDay = raw.allDay === true;
  if (!title || title.length > MAX_TITLE_LENGTH) throw new GoogleCalendarError('invalid-input', 'event title is invalid');
  if (!DATE_PATTERN.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new GoogleCalendarError('invalid-input', 'event date is invalid');
  }
  if (allDay) return { title, allDay, date };
  const startTime = typeof raw.startTime === 'string' ? raw.startTime : '';
  const endTime = typeof raw.endTime === 'string' ? raw.endTime : '';
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || endTime <= startTime) {
    throw new GoogleCalendarError('invalid-input', 'event time range is invalid');
  }
  return { title, allDay, date, startTime, endTime };
}

/**
 * 将事件输入转换为 Google Calendar 请求体
 * @description 定时事件附带本机 IANA 时区，避免手动拼接偏移量。
 * @param input - 已通过 normalizeEventInput 校验的输入
 * @returns Google Calendar Event 请求体
 */
export function buildEventBody(input: GoogleCalendarEventInput): Record<string, unknown> {
  if (input.allDay) {
    return {
      summary: input.title,
      start: { date: input.date },
      end: { date: shiftDateKey(input.date, 1) },
    };
  }
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    summary: input.title,
    start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone },
    end: { dateTime: `${input.date}T${input.endTime}:00`, timeZone },
  };
}

/**
 * 查询 gws 的登录状态
 * @description gws 未找到时直接返回 available=false，不启动子进程。
 * @returns 可用性与登录状态
 */
export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  if (!resolveGwsBinary()) return { available: false, loggedIn: false };
  try {
    const data = await runGws(['auth', 'status']);
    return { available: true, loggedIn: isRecord(data) && data.token_valid === true };
  } catch (error) {
    if (error instanceof GoogleCalendarError && error.code === 'not-logged-in') {
      return { available: true, loggedIn: false };
    }
    throw error;
  }
}

/**
 * 从 calendarList 响应中筛出需要读取的日历
 * @description 与 Google 日历网页一致：只读取已勾选（selected）且未隐藏（hidden）的日历。
 * @param data - gws calendarList list 的响应
 * @returns 日历 ID、颜色与读写权限；ID 非法的条目会被丢弃
 */
function toSelectedCalendars(data: unknown): CalendarSource[] {
  const items = isRecord(data) && Array.isArray(data.items) ? data.items : [];
  return items.filter(isRecord).flatMap((item): CalendarSource[] => {
    const calendarId = typeof item.id === 'string' ? item.id : '';
    if (item.selected !== true || item.hidden === true || !CALENDAR_ID_PATTERN.test(calendarId)) return [];
    const color = typeof item.backgroundColor === 'string' && COLOR_PATTERN.test(item.backgroundColor)
      ? item.backgroundColor
      : FALLBACK_EVENT_COLOR;
    const role = typeof item.accessRole === 'string' ? item.accessRole : '';
    return [{ calendarId, color, readOnly: !WRITABLE_ACCESS_ROLES.has(role) }];
  });
}

/**
 * 读取单个日历在时间窗口内的事件
 * @description 使用 singleEvents 展开周期事件，并过滤已取消的事件。
 * @param source - 目标日历
 * @param range - 查询窗口
 * @returns 规范化事件列表
 */
async function listCalendarEvents(source: CalendarSource, range: GoogleCalendarRange): Promise<GoogleCalendarEvent[]> {
  const params = {
    calendarId: source.calendarId,
    timeMin: range.timeMin,
    timeMax: range.timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: LIST_MAX_RESULTS,
  };
  const data = await runGws(['calendar', 'events', 'list', '--params', JSON.stringify(params)]);
  const items = isRecord(data) && Array.isArray(data.items) ? data.items : [];
  return items
    .filter(isRecord)
    .filter((item) => item.status !== 'cancelled')
    .map((item) => toEvent(item, source))
    .filter((event): event is GoogleCalendarEvent => event !== null);
}

/**
 * 读取所有已勾选日历在时间窗口内的事件并合并
 * @description 先读取日历列表，再并行查询各日历；单个日历失败只会丢掉该日历的事件，
 * 仅当所有日历都失败时才抛出第一个错误，以便界面展示状态提示。
 * @param range - 查询窗口，timeMin 必须早于 timeMax
 * @returns 合并后的规范化事件列表，按起始时间排序
 * @throws GoogleCalendarError 窗口非法、日历列表读取失败或全部日历失败时抛出
 */
export async function listGoogleCalendarEvents(range: GoogleCalendarRange): Promise<GoogleCalendarEvent[]> {
  const min = Date.parse(range.timeMin);
  const max = Date.parse(range.timeMax);
  if (Number.isNaN(min) || Number.isNaN(max) || min >= max) {
    throw new GoogleCalendarError('invalid-input', 'calendar range is invalid');
  }
  const calendars = toSelectedCalendars(await runGws(['calendar', 'calendarList', 'list', '--params', '{}']));
  const results = await Promise.allSettled(calendars.map((source) => listCalendarEvents(source, range)));
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (calendars.length > 0 && failures.length === calendars.length) {
    const reason: unknown = failures[0].reason;
    throw reason instanceof GoogleCalendarError ? reason : new GoogleCalendarError('unknown', 'calendar events could not be loaded');
  }
  return results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/**
 * 在主日历新建事件
 * @param raw - 未受信任的事件输入
 * @returns 创建后的规范化事件
 */
export async function createGoogleCalendarEvent(raw: unknown): Promise<GoogleCalendarEvent> {
  const body = buildEventBody(normalizeEventInput(raw));
  const data = await runGws(['calendar', 'events', 'insert', '--params', JSON.stringify({ calendarId: 'primary' }), '--json', JSON.stringify(body)]);
  const event = isRecord(data) ? toEvent(data, PRIMARY_SOURCE) : null;
  if (!event) throw new GoogleCalendarError('unknown', 'created event was not returned');
  return event;
}

/**
 * 校验日历 ID 与事件 ID 都能安全拼入请求
 * @param calendarId - Google 日历 ID
 * @param id - Google 事件 ID
 * @throws GoogleCalendarError 任一 ID 非法时抛出 invalid-input
 */
function assertEventTarget(calendarId: string, id: string): void {
  if (!CALENDAR_ID_PATTERN.test(calendarId)) throw new GoogleCalendarError('invalid-input', 'calendar id is invalid');
  if (!EVENT_ID_PATTERN.test(id)) throw new GoogleCalendarError('invalid-input', 'event id is invalid');
}

/**
 * 整体更新指定日历中的事件标题与时间
 * @description 表单总是提供完整字段，因此以 patch 方式提交完整的标题与时间。
 * 返回事件的颜色沿用默认值，列表刷新后会被日历信息覆盖。
 * @param calendarId - 事件所属日历 ID
 * @param id - Google 事件 ID
 * @param raw - 未受信任的事件输入
 * @returns 更新后的规范化事件
 * @throws GoogleCalendarError 日历 ID 或事件 ID 非法时抛出 invalid-input
 */
export async function updateGoogleCalendarEvent(calendarId: string, id: string, raw: unknown): Promise<GoogleCalendarEvent> {
  assertEventTarget(calendarId, id);
  const body = buildEventBody(normalizeEventInput(raw));
  const data = await runGws(['calendar', 'events', 'patch', '--params', JSON.stringify({ calendarId, eventId: id }), '--json', JSON.stringify(body)]);
  const event = isRecord(data) ? toEvent(data, { ...PRIMARY_SOURCE, calendarId }) : null;
  if (!event) throw new GoogleCalendarError('unknown', 'updated event was not returned');
  return event;
}

/**
 * 删除指定日历中的事件
 * @description 删除确认由渲染进程的二次确认控件负责，服务层只做参数校验。
 * @param calendarId - 事件所属日历 ID
 * @param id - Google 事件 ID
 * @throws GoogleCalendarError 日历 ID 或事件 ID 非法时抛出 invalid-input
 */
export async function removeGoogleCalendarEvent(calendarId: string, id: string): Promise<void> {
  assertEventTarget(calendarId, id);
  await runGws(['calendar', 'events', 'delete', '--params', JSON.stringify({ calendarId, eventId: id })]);
}
