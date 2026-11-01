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
 * @file imageFiles.ts
 * @description 把用户选择或粘贴的图片文件转成 ACP 需要的 base64 数据
 * @author 鸡哥
 */

import type { AcpImageData } from '../../../../../../../shared/acpTypes';

/** 单张图片的大小上限，防止 base64 经 IPC 与管道传输时过大 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** 单次提问最多附带的图片数量 */
export const MAX_IMAGES = 8;

/**
 * 判断文件是否为可附带的图片
 * @param file - 文件对象
 * @returns 是否为 image/* 类型
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 读取图片文件为 base64（不含 data: 前缀）
 * @param file - 图片文件
 * @returns 图片数据
 */
export function readImageFile(file: File): Promise<AcpImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve({ data: comma >= 0 ? result.slice(comma + 1) : result, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}
