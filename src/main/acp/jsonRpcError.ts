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
 * @file jsonRpcError.ts
 * @description 携带 JSON-RPC 错误码的异常类型
 * @author 鸡哥
 */

/** 携带 JSON-RPC 错误码的异常 */
export class JsonRpcError extends Error {
  /** JSON-RPC 错误码 */
  readonly code: number;

  /**
   * @param code - JSON-RPC 错误码
   * @param message - 错误描述
   */
  constructor(code: number, message: string) {
    super(message);
    this.name = 'JsonRpcError';
    this.code = code;
  }
}
