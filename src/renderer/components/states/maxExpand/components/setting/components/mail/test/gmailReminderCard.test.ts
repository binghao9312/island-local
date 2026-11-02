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
 * @file gmailReminderCard.test.ts
 * @description Gmail 新邮件提醒设置卡片测试：初始读取、开关持久化、立即检查与状态广播
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GmailReminderCard } from '../GmailReminderCard';
import { elementProps, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../app/components/test/themeHookHarness';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

type SettingsListener = (channel: string, value: unknown) => void;

let listener: SettingsListener | null;
const unsubscribe = vi.fn(() => { listener = null; });
const api = {
  gmailRemindersEnabledGet: vi.fn(() => Promise.resolve(true)),
  gmailRemindersEnabledSet: vi.fn(() => Promise.resolve(true)),
  gmailCheckNow: vi.fn(() => Promise.resolve({ kind: 'network', checkedAt: 1 })),
  googleOpenLogin: vi.fn(() => Promise.resolve('opened')),
  gmailStatusGet: vi.fn(() => Promise.resolve({ kind: 'ok', checkedAt: 1 })),
  onSettingsChanged: vi.fn((callback: SettingsListener) => { listener = callback; return unsubscribe; }),
};

beforeEach(() => {
  resetLifecycle();
  listener = null;
  vi.clearAllMocks();
  api.gmailRemindersEnabledGet.mockResolvedValue(true);
  api.gmailStatusGet.mockResolvedValue({ kind: 'ok', checkedAt: 1 });
  api.gmailCheckNow.mockResolvedValue({ kind: 'network', checkedAt: 1 });
  api.googleOpenLogin.mockResolvedValue('opened');
  vi.stubGlobal('window', { api });
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/**
 * 排空已解析的 Promise 回调，使异步状态写入生效。
 * @returns 无返回值。
 */
async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}

/**
 * 渲染卡片并执行挂载副作用。
 * @returns 渲染树
 */
function mount() {
  renderWithHooks(() => GmailReminderCard());
  runEffects();
  return renderWithHooks(() => GmailReminderCard());
}

describe('GmailReminderCard', () => {
  it('loads the stored switch and the latest status on mount', async () => {
    api.gmailRemindersEnabledGet.mockResolvedValue(false);
    mount();
    await settle();
    const tree = renderWithHooks(() => GmailReminderCard());
    const checkbox = findElement(tree, (node) => node.type === 'input');
    expect(elementProps(checkbox).checked).toBe(false);
    expect(textContent(tree)).toContain('settings.mail.gmail.status.ok');
  });

  it('persists the switch and reflects the new value', async () => {
    mount(); await settle();
    const tree = renderWithHooks(() => GmailReminderCard());
    invoke(findElement(tree, (node) => node.type === 'input'), 'onChange', { target: { checked: false } });
    expect(api.gmailRemindersEnabledSet).toHaveBeenCalledWith(false);
    const updated = renderWithHooks(() => GmailReminderCard());
    expect(elementProps(findElement(updated, (node) => node.type === 'input')).checked).toBe(false);
  });

  it('runs a manual check and shows the returned status', async () => {
    mount(); await settle();
    const tree = renderWithHooks(() => GmailReminderCard());
    invoke(findElement(tree, (node) => node.type === 'button'), 'onClick');
    expect(api.gmailCheckNow).toHaveBeenCalledOnce();
    await settle();
    const updated = renderWithHooks(() => GmailReminderCard());
    expect(textContent(updated)).toContain('settings.mail.gmail.status.network');
  });

  it('opens the Google login and shows no hint when it opens', async () => {
    mount(); await settle();
    const tree = renderWithHooks(() => GmailReminderCard());
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node).includes('settings.mail.gmail.login')), 'onClick');
    expect(api.googleOpenLogin).toHaveBeenCalledOnce();
    await settle();
    expect(textContent(renderWithHooks(() => GmailReminderCard()))).not.toContain('settings.mail.gmail.loginMissing');
  });

  it('shows the install hint when gws is missing', async () => {
    api.googleOpenLogin.mockResolvedValue('missing');
    mount(); await settle();
    const tree = renderWithHooks(() => GmailReminderCard());
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node).includes('settings.mail.gmail.login')), 'onClick');
    await settle();
    expect(textContent(renderWithHooks(() => GmailReminderCard()))).toContain('settings.mail.gmail.loginMissing');
  });

  it('updates the status line when the main process broadcasts a change', async () => {
    mount(); await settle();
    listener?.('gmail:status', { kind: 'not-logged-in', checkedAt: 2 });
    const updated = renderWithHooks(() => GmailReminderCard());
    expect(textContent(updated)).toContain('settings.mail.gmail.status.notLoggedIn');
  });

  it('ignores unrelated settings broadcasts', async () => {
    mount(); await settle();
    listener?.('music:lyrics-enabled', false);
    const updated = renderWithHooks(() => GmailReminderCard());
    expect(textContent(updated)).toContain('settings.mail.gmail.status.ok');
  });

  it('removes the broadcast listener on unmount', async () => {
    mount(); await settle();
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(listener).toBeNull();
  });
});
