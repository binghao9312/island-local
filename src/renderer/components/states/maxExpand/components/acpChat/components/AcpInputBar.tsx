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
 * @file AcpInputBar.tsx
 * @description ACP 聊天输入栏：多行输入、图片附件（选择/粘贴）、发送与停止
 * @author 鸡哥
 */

import { useCallback, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpImageData } from '../../../../../../../shared/acpTypes';
import { MAX_IMAGE_BYTES, MAX_IMAGES, isImageFile, readImageFile } from '../utils/imageFiles';

interface AcpInputBarProps {
  /** 一轮提问进行中：显示停止按钮并禁止再次发送 */
  busy: boolean;
  /** 发送消息 */
  onSend: (text: string, images: AcpImageData[]) => void;
  /** 停止当前一轮 */
  onStop: () => void;
}

/**
 * 输入栏
 * @param props - 组件属性
 * @param props.busy - 一轮提问是否进行中
 * @param props.onSend - 发送消息回调
 * @param props.onStop - 停止回调
 * @returns 输入栏元素
 */
export function AcpInputBar({ busy, onSend, onStop }: AcpInputBarProps): ReactElement {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [images, setImages] = useState<AcpImageData[]>([]);
  const [attachError, setAttachError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: File[]): Promise<void> => {
    const picked = files.filter(isImageFile);
    if (picked.length === 0) return;
    const accepted = picked.filter((file) => file.size <= MAX_IMAGE_BYTES);
    const oversized = accepted.length < picked.length;
    try {
      const read = await Promise.all(accepted.map(readImageFile));
      setAttachError(oversized || images.length + read.length > MAX_IMAGES ? t('acpChat.input.attachLimit') : '');
      setImages((current) => [...current, ...read].slice(0, MAX_IMAGES));
    } catch {
      setAttachError(t('acpChat.input.attachFailed'));
    }
  }, [images.length, t]);

  const canSend = !busy && (text.trim().length > 0 || images.length > 0);

  const submit = useCallback((): void => {
    if (!canSend) return;
    onSend(text.trim(), images);
    setText('');
    setImages([]);
    setAttachError('');
  }, [canSend, images, onSend, text]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    // 输入法组合输入期间的回车用于确认候选词，不应发送
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = Array.from(event.clipboardData.files).filter(isImageFile);
    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[rgba(var(--color-text-rgb),0.06)] px-3 py-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={`${image.data.length}-${image.data.slice(0, 32)}-${index}`} className="relative">
              <img
                className="size-14 rounded-lg object-cover"
                src={`data:${image.mimeType};base64,${image.data}`}
                alt=""
              />
              <button
                type="button"
                className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-white"
                aria-label={t('acpChat.input.removeImage')}
                onClick={() => setImages((current) => current.filter((_item, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {attachError && <div className="text-[11px] text-amber-400" role="status">{attachError}</div>}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--color-text-rgb),0.08)] text-[rgba(var(--color-text-rgb),0.7)] hover:bg-[rgba(var(--color-text-rgb),0.15)]"
          aria-label={t('acpChat.input.attachImage')}
          title={t('acpChat.input.attachImage')}
          onClick={() => fileInputRef.current?.click()}
        >
          +
        </button>
        <textarea
          className="max-h-32 min-h-8 flex-1 resize-none rounded-lg bg-[rgba(var(--color-text-rgb),0.08)] px-3 py-1.5 text-[13px] text-[rgba(var(--color-text-rgb),0.9)] outline-none placeholder:text-[rgba(var(--color-text-rgb),0.35)]"
          rows={1}
          value={text}
          placeholder={t('acpChat.input.placeholder')}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        {busy ? (
          <button
            type="button"
            className="h-8 shrink-0 rounded-lg bg-red-500/25 px-3 text-xs text-red-200 hover:bg-red-500/35"
            onClick={onStop}
          >
            {t('acpChat.input.stop')}
          </button>
        ) : (
          <button
            type="button"
            className="h-8 shrink-0 rounded-lg bg-emerald-500/30 px-3 text-xs text-emerald-100 hover:bg-emerald-500/40 disabled:opacity-40"
            disabled={!canSend}
            onClick={submit}
          >
            {t('acpChat.input.send')}
          </button>
        )}
      </div>
    </div>
  );
}
