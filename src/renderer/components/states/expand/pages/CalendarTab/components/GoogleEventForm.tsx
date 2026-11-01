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
 * @file GoogleEventForm.tsx
 * @description 展开日历中的 Google 日程紧凑表单：新建、编辑标题与时间，删除需二次确认
 * @author 鸡哥
 */

import { useState, type FormEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { validateEventFormValues, type GoogleEventFormValues } from '../utils/googleCalendarEvents';

interface GoogleEventFormProps {
  /** 表单初始值，由父组件按新建或编辑模式生成 */
  initialValues: GoogleEventFormValues;
  /** 是否为编辑已有事件，编辑模式才显示删除入口 */
  editing: boolean;
  /** 提交表单，返回是否保存成功；成功后由父组件关闭表单 */
  onSubmit: (values: GoogleEventFormValues) => Promise<boolean>;
  /** 删除当前事件，返回是否成功；仅编辑模式提供 */
  onDelete?: () => Promise<boolean>;
  /** 放弃修改并关闭表单 */
  onClose: () => void;
}

/**
 * 紧凑的 Google 日程表单
 * @description 校验只做即时反馈；删除需先点击一次进入确认状态，再次点击才真正调用主进程。
 * @param initialValues - 表单初始字段
 * @param editing - 是否为编辑模式
 * @param onSubmit - 保存回调
 * @param onDelete - 删除回调
 * @param onClose - 关闭回调
 * @returns 表单元素
 */
export function GoogleEventForm({
  initialValues,
  editing,
  onSubmit,
  onDelete,
  onClose,
}: GoogleEventFormProps): ReactElement {
  const { t } = useTranslation();
  const [values, setValues] = useState<GoogleEventFormValues>(initialValues);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /**
   * 合并部分字段更新
   * @param patch - 需要修改的字段
   */
  const update = (patch: Partial<GoogleEventFormValues>): void => {
    setValues((previous) => ({ ...previous, ...patch }));
  };

  /**
   * 校验并提交表单
   * @param event - 表单提交事件
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (validateEventFormValues(values)) {
      setErrorKey('invalid');
      return;
    }
    setSubmitting(true);
    setErrorKey(null);
    const saved = await onSubmit(values);
    setSubmitting(false);
    if (!saved) setErrorKey('writeFailed');
  };

  /** 删除的两步确认：第一次点击进入确认，第二次点击才调用删除 */
  const handleDelete = async (): Promise<void> => {
    if (!onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSubmitting(true);
    const deleted = await onDelete();
    setSubmitting(false);
    if (!deleted) {
      setConfirmingDelete(false);
      setErrorKey('writeFailed');
    }
  };

  return (
    <form className="compact-calendar-google-form" onSubmit={(event) => { void handleSubmit(event); }}>
      <div className="compact-calendar-events-title">
        {editing
          ? t('expanded.calendar.google.editEvent', { defaultValue: 'Edit event' })
          : t('expanded.calendar.google.newEvent', { defaultValue: 'New event' })}
      </div>
      <label className="compact-calendar-google-field">
        <span>{t('expanded.calendar.google.fieldTitle', { defaultValue: 'Title' })}</span>
        <input
          type="text"
          value={values.title}
          maxLength={1024}
          onChange={(event) => update({ title: event.target.value })}
        />
      </label>
      <label className="compact-calendar-google-field compact-calendar-google-field-inline">
        <input
          type="checkbox"
          checked={values.allDay}
          onChange={(event) => update({ allDay: event.target.checked })}
        />
        <span>{t('expanded.calendar.google.allDay', { defaultValue: 'All day' })}</span>
      </label>
      <label className="compact-calendar-google-field">
        <span>{t('expanded.calendar.google.fieldDate', { defaultValue: 'Date' })}</span>
        <input
          type="date"
          value={values.date}
          onChange={(event) => update({ date: event.target.value })}
        />
      </label>
      {!values.allDay && (
        <div className="compact-calendar-google-time-row">
          <label className="compact-calendar-google-field">
            <span>{t('expanded.calendar.google.fieldStart', { defaultValue: 'Start' })}</span>
            <input
              type="time"
              value={values.startTime}
              onChange={(event) => update({ startTime: event.target.value })}
            />
          </label>
          <label className="compact-calendar-google-field">
            <span>{t('expanded.calendar.google.fieldEnd', { defaultValue: 'End' })}</span>
            <input
              type="time"
              value={values.endTime}
              onChange={(event) => update({ endTime: event.target.value })}
            />
          </label>
        </div>
      )}
      {errorKey && (
        <div className="compact-calendar-google-error" role="alert">
          {errorKey === 'invalid'
            ? t('expanded.calendar.google.invalid', { defaultValue: 'Please check the title, date and time.' })
            : t('expanded.calendar.google.writeFailed', { defaultValue: 'Could not save the event. Please try again.' })}
        </div>
      )}
      <div className="compact-calendar-google-actions">
        {editing && onDelete && (
          <button type="button" className="compact-calendar-google-danger" disabled={submitting} onClick={() => { void handleDelete(); }}>
            {confirmingDelete
              ? t('expanded.calendar.google.confirmDelete', { defaultValue: 'Confirm delete' })
              : t('expanded.calendar.google.delete', { defaultValue: 'Delete' })}
          </button>
        )}
        <button type="button" onClick={onClose}>
          {t('expanded.calendar.google.cancel', { defaultValue: 'Cancel' })}
        </button>
        <button type="submit" disabled={submitting}>
          {t('expanded.calendar.google.save', { defaultValue: 'Save' })}
        </button>
      </div>
    </form>
  );
}
