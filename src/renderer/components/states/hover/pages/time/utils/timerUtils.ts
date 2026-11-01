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
 * @file timerUtils.ts
 * @description 计时器相关工具函数
 * @author 鸡哥
 */

/**
 * 数字补零
 * @param value - 数值
 * @returns 两位字符串
 */
export function padZero(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * 将总秒数拆分为时/分/秒
 * @param totalSeconds - 总秒数
 * @returns 时分秒对象
 */
export function getTimeParts(totalSeconds: number): { h: number; m: number; s: number } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
}

/**
 * 清洗输入框文本，只保留数字并截断到两位
 * @param raw - 输入框原始文本
 * @returns 至多两位的纯数字字符串（可为空串）
 */
export function sanitizeTimeDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}

/**
 * 将输入草稿限制到上限并补零
 * @description 空串或非数字视为 0，超出上限时取上限（如分钟 99 → 59）
 * @param raw - 草稿文本
 * @param max - 该字段上限（时 23，分/秒 59）
 * @returns 两位补零字符串
 */
export function clampTimeField(raw: string, max: number): string {
  const num = parseInt(raw, 10);
  return padZero(Number.isNaN(num) ? 0 : Math.min(num, max));
}

/**
 * 将时/分/秒输入字符串换算为总秒数
 * @param hours - 小时字符串
 * @param minutes - 分钟字符串
 * @param seconds - 秒字符串
 * @returns 总秒数，非数字按 0 处理
 */
export function getTotalSeconds(hours: string, minutes: string, seconds: string): number {
  return (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
}
