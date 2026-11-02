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
 * @file googleSettingsSection.test.tsx
 * @description Google 账号区块测试：三张卡片、登录按钮调用桥接、状态展示与重新检查
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  googleOpenLogin: vi.fn(),
  gcalStatus: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('window', { api });
});

vi.mock('../../mail/GmailReminderCard', () => ({ GmailReminderCard: () => null }));
vi.mock('../../app/components/GoogleCalendarSyncCard', () => ({ GoogleCalendarSyncCard: () => null }));

import { flushEffects, render, nodes, text, trigger } from '../../../../../test/componentHarness';
import { GoogleSettingsSection } from '../GoogleSettingsSection';
import { GmailReminderCard } from '../../mail/GmailReminderCard';
import { GoogleCalendarSyncCard } from '../../app/components/GoogleCalendarSyncCard';

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

async function mount(status: unknown) {
  api.gcalStatus.mockResolvedValue(status);
  render(GoogleSettingsSection);
  flushEffects();
  await settle();
  return render(GoogleSettingsSection);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.googleOpenLogin.mockResolvedValue('opened');
});

describe('GoogleSettingsSection', () => {
  it('renders the status card with the Gmail and calendar cards', async () => {
    const tree = await mount({ ok: true, data: { available: true, loggedIn: true } });

    expect(text(tree)).toContain('settings.google.title');
    expect(nodes(tree, GmailReminderCard)).toHaveLength(1);
    expect(nodes(tree, GoogleCalendarSyncCard)).toHaveLength(1);
  });

  it('shows the logged-in status', async () => {
    const tree = await mount({ ok: true, data: { available: true, loggedIn: true } });

    expect(text(tree)).toContain('settings.google.status.loggedIn');
  });

  it('shows not-logged-in, missing and error statuses', async () => {
    expect(text(await mount({ ok: true, data: { available: true, loggedIn: false } }))).toContain('settings.google.status.notLoggedIn');
    expect(text(await mount({ ok: true, data: { available: false, loggedIn: false } }))).toContain('settings.google.status.missing');
    expect(text(await mount({ ok: false, error: 'boom' }))).toContain('settings.google.status.error');
  });

  it('opens the login through the bridge without an install hint', async () => {
    const tree = await mount({ ok: true, data: { available: true, loggedIn: false } });

    trigger(tree, 'button', 'onClick');
    await settle();

    expect(api.googleOpenLogin).toHaveBeenCalledOnce();
    expect(text(render(GoogleSettingsSection))).not.toContain('settings.google.loginMissing');
  });

  it('shows the install hint when gws is missing', async () => {
    api.googleOpenLogin.mockResolvedValue('missing');
    const tree = await mount({ ok: true, data: { available: false, loggedIn: false } });

    trigger(tree, 'button', 'onClick');
    await settle();

    expect(text(render(GoogleSettingsSection))).toContain('settings.google.loginMissing');
  });

  it('re-queries the status when recheck is pressed', async () => {
    const tree = await mount({ ok: true, data: { available: true, loggedIn: false } });
    api.gcalStatus.mockClear();
    api.gcalStatus.mockResolvedValue({ ok: true, data: { available: true, loggedIn: true } });

    (nodes(tree, 'button')[1].props.onClick as () => void)();
    await settle();

    expect(api.gcalStatus).toHaveBeenCalledOnce();
    expect(text(render(GoogleSettingsSection))).toContain('settings.google.status.loggedIn');
  });
});
