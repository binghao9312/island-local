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
 * @file gmailReminderTypes.ts
 * @description Gmail 新邮件提醒在主进程、预加载脚本与渲染进程之间共享的类型
 * @author 鸡哥
 */

/**
 * Gmail 提醒状态种类
 * @description ok 正常轮询；disabled 已关闭；missing 未找到 gws；not-logged-in 未登录；network 网络或超时；error 其他失败
 */
export type GmailReminderStatusKind = 'ok' | 'disabled' | 'missing' | 'not-logged-in' | 'network' | 'error';

/** Gmail 提醒状态，用于设置页状态行 */
export interface GmailReminderStatus {
  kind: GmailReminderStatusKind;
  /** 最近一次检查完成的时间戳（毫秒），从未检查时为 null */
  checkedAt: number | null;
}

/**
 * 新邮件提醒负载
 * @description count 为本次新发现的未读邮件数量；url 指向最新一封邮件所在的会话
 */
export interface GmailNewMailPayload {
  sender: string;
  subject: string;
  url: string;
  count: number;
}
