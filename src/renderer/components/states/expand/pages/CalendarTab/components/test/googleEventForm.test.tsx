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
 * @file googleEventForm.test.tsx
 * @description Google 日程紧凑表单的交互测试：提交校验、两步删除与全天事件的时间字段隐藏
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, text, trigger } from '../../../../../maxExpand/test/componentHarness';
import { GoogleEventForm } from '../GoogleEventForm';
import type { GoogleEventFormValues } from '../../utils/googleCalendarEvents';

const timedValues: GoogleEventFormValues = {
  title: 'Review',
  allDay: false,
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
};

describe('GoogleEventForm', () => {
  it('passes the field values to onSubmit when they are valid', () => {
    const onSubmit = vi.fn(async () => true);
    const tree = render(GoogleEventForm, { initialValues: timedValues, editing: false, onSubmit, onClose: vi.fn() });

    trigger(tree, 'form', 'onSubmit', { preventDefault: vi.fn() });

    expect(onSubmit).toHaveBeenCalledWith(timedValues);
  });

  it('blocks submission and explains the problem when the title is blank', () => {
    const onSubmit = vi.fn(async () => true);
    const props = {
      initialValues: { ...timedValues, title: '   ' },
      editing: false,
      onSubmit,
      onClose: vi.fn(),
    };
    const tree = render(GoogleEventForm, props);

    trigger(tree, 'form', 'onSubmit', { preventDefault: vi.fn() });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(text(render(GoogleEventForm, props))).toContain('expanded.calendar.google.invalid');
  });

  it('requires a second click before deleting an event', () => {
    const onDelete = vi.fn(async () => true);
    const props = { initialValues: timedValues, editing: true, onSubmit: vi.fn(async () => true), onDelete, onClose: vi.fn() };

    trigger(render(GoogleEventForm, props), '.compact-calendar-google-danger', 'onClick');
    expect(onDelete).not.toHaveBeenCalled();

    const confirming = render(GoogleEventForm, props);
    expect(text(confirming)).toContain('expanded.calendar.google.confirmDelete');
    trigger(confirming, '.compact-calendar-google-danger', 'onClick');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('offers no delete action when creating a new event', () => {
    const tree = render(GoogleEventForm, { initialValues: timedValues, editing: false, onSubmit: vi.fn(), onClose: vi.fn() });

    expect(nodes(tree, '.compact-calendar-google-danger')).toHaveLength(0);
  });

  it('hides the time inputs for all-day events', () => {
    const tree = render(GoogleEventForm, {
      initialValues: { ...timedValues, allDay: true },
      editing: false,
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });

    expect(nodes(tree, '.compact-calendar-google-time-row')).toHaveLength(0);
  });
});
