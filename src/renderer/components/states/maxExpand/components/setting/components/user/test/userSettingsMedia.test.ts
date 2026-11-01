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
 * @file userSettingsMedia.test.ts
 * @description 用户订阅充值与导航状态真实回调回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { unmountHooks } from '../../app/components/test/themeHookHarness';
import { bootUser, cleanupUser, clickUser, mocks, navigateUser, profile, renderUser, settleUser, setupUser, skeletonLabels } from './userSettingsFixture';
beforeEach(setupUser);
afterEach(cleanupUser);
describe('订阅价格、充值余额和金额输入', () => {
  it.each([{
    value: {
      amountYuan: ' 15.90 ',
      billingCycle: 'MONTH',
      freeDesc: ' Free desc ',
      proDesc: ' Pro desc ',
      freeFeatures: ['Free', '', 3],
      proFeatures: ['Pro', '  ', null]
    },
    expected: '¥15.90 / settings.user.pro.billingCycle.month'
  }, {
    value: {
      amountFen: 1590,
      billingCycle: 'YEAR',
      freeDesc: 42,
      proDesc: null,
      freeFeatures: 42,
      proFeatures: null
    },
    expected: '¥15.90 / YEAR'
  }, {
    value: {
      amountYuan: '',
      amountFen: 1500,
      billingCycle: ''
    },
    expected: '¥15.00'
  }, {
    value: {
      amountYuan: 42,
      amountFen: 'invalid',
      billingCycle: ''
    },
    expected: 'settings.user.pro.pro.priceUnavailable'
  }, {
    value: {
      amountYuan: '15',
      billingCycle: null
    },
    expected: '¥15'
  }])('格式化价格和计划权益 $expected', async ({
    value: value,
    expected: expected
  }) => {
    mocks.api.fetchProMonthPricing.mockResolvedValue({
      ok: true,
      data: value
    });
    await bootUser('pro');
    expect(textContent(renderUser())).toContain(expected);
    await clickUser('settings.user.actions.buyPro');
    expect(mocks.store.setPayment).toHaveBeenCalledWith();
  });
  it('Pro角色展示会员徽标和续费入口', async () => {
    const pro = {
      ...profile,
      role: ' ROLE_PRO '
    };
    mocks.profile = pro;
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: true,
      data: pro
    });
    await bootUser('pro');
    await clickUser('settings.user.actions.renewPro');
    expect(mocks.store.setPayment).toHaveBeenCalledOnce();
    await navigateUser('info');
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-info-summary-card'))).className)).toContain('--pro');
  });
  it('JWT Pro角色同样展示会员摘要', async () => {
    mocks.token = `h.${Buffer.from('{"role":"pro"}').toString('base64url')}.s`;
    await bootUser();
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-info-summary-card'))).className)).toContain('--pro');
  });
  it('价格读取中显示加载，卸载后忽略迟到结果', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.api.fetchProMonthPricing.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    await bootUser('pro');
    expect(skeletonLabels(renderUser())).toEqual(['settings.user.pro.pro.priceLoading']);
    unmountHooks();
    resolve?.({
      ok: true,
      data: {
        amountYuan: '10',
        billingCycle: 'MONTH'
      }
    });
    await settleUser();
    expect(textContent(renderUser())).not.toContain('¥10');
  });
  it.each([true, false])('余额读取成功=%s和自定义充值输入', async (ok) => {
    mocks.api.fetchAgentBalance.mockResolvedValue({
      ok,
      data: ok ? {
        balanceYuan: '19.99'
      } : undefined
    });
    await bootUser('recharge');
    expect(textContent(renderUser()).includes('¥19.99')).toBe(ok);
    expect(skeletonLabels(renderUser())).toEqual([]);
    const input = findElement(renderUser(), (node) => node.type === 'input');
    ['', '-1', 'not-a-number', '0', '12.345'].forEach((value) => {
      invoke(input, 'onChange', {
        target: {
          value
        }
      });
      const submit = findElement(renderUser(), (node) => node.type === 'button' && String(elementProps(node).className) === 'settings-user-primary-btn');
      invoke(submit, 'onClick');
      expect(elementProps(submit).disabled).toBe(value !== '12.345');
    });
    expect(mocks.store.setPayment).toHaveBeenCalledOnce();
    expect(mocks.store.setPayment).toHaveBeenCalledWith({
      type: 'recharge',
      amountFen: 1235
    });
    await [1, 10, 30, 50, 100].reduce(async (previous, amount) => {
      await previous;
      invoke(findElement(renderUser(), (node) => node.type === 'button' && node.key === String(amount)), 'onClick');
      await clickUser('settings.user.recharge.confirm');
      expect(mocks.store.setPayment).toHaveBeenLastCalledWith({
        type: 'recharge',
        amountFen: amount * 100
      });
      invoke(findElement(renderUser(), (node) => node.type === 'button' && node.key === String(amount)), 'onClick');
      expect(textContent(renderUser())).toContain('settings.user.recharge.selectAmount');
    }, Promise.resolve());
  });
  it('余额卸载后不应用迟到数据', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.api.fetchAgentBalance.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    await bootUser('recharge');
    expect(skeletonLabels(renderUser())).toEqual(['settings.user.recharge.balanceLoading']);
    unmountHooks();
    resolve?.({
      ok: true,
      data: {
        balanceYuan: '99.99'
      }
    });
    await settleUser();
    expect(textContent(renderUser())).not.toContain('99.99');
  });
});
describe('导航状态', () => {
  it('摘要所有导航卡片和展开导航执行实际回调', async () => {
    await bootUser();
    const tree = renderUser();
    const cards = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-index-card') && !textContent(node).includes('settings.user.actions.refresh'));
    const expected = ['pro', 'recharge', 'orders', 'edit', 'edit', 'password', 'oauth', 'questionnaire', 'account'];
    cards.forEach((node, index) => {
      invoke(node, 'onClick');
      expect(elementProps(findElement(renderUser(), (entry) => 'activePage' in elementProps(entry))).activePage).toBe(expected[index]);
    });
    const toggle = findElement(renderUser(), (node) => 'onToggle' in elementProps(node));
    invoke(toggle, 'onToggle');
    expect(elementProps(findElement(renderUser(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(true);
    invoke(findElement(renderUser(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(renderUser(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(false);
  });
  it('显示通知问卷入口并转发打开和关闭', async () => {
    mocks.reminder.questionnaire = {
      id: 1
    };
    mocks.reminder.count = 2;
    await bootUser();
    const banner = findElement(renderUser(), (node) => 'onDismiss' in elementProps(node));
    invoke(banner, 'onOpen');
    invoke(banner, 'onDismiss');
    expect(mocks.store.setQuestionnaire).toHaveBeenCalledOnce();
    expect(mocks.reminder.dismiss).toHaveBeenCalledOnce();
  });
});
