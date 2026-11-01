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
 * @file serverFeaturesConfig.ts
 * @description 云端与账户相关功能的总开关，主进程与渲染进程共用
 * @author 鸡哥
 */

/**
 * 是否启用云端与账户相关功能。
 * @description 本地优先构建有意关闭：登录、注册、找回密码、OAuth、支付、云壁纸、问题反馈、
 * 调查问卷等云端与账户功能在本地优先构建中全部停用，不会产生任何相关网络请求，
 * 隐藏对应入口并保持静默。实现代码完整保留，改为 true 即可恢复。
 */
export const SERVER_FEATURES_ENABLED = false as boolean;
