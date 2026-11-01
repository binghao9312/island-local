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
 * @file updatesConfig.ts
 * @description 发布与更新检测的总开关，主进程与渲染进程共用
 * @author 鸡哥
 */

/**
 * 是否启用发布与更新检测。
 * @description 本地优先构建有意关闭：关闭后启动自动检查、手动检查与下载 IPC、
 * 渲染进程预检查流程、版本信息接口以及更新设置入口全部停用，不会产生任何更新相关网络请求，
 * 也不会弹出错误提示。更新实现代码完整保留，改为 true 即可恢复。
 */
export const UPDATES_ENABLED = false as boolean;
