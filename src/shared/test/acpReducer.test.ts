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
 * @file acpReducer.test.ts
 * @description ACP session/update 归并为聊天条目的规则测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { reduceAcpUpdate } from '../acpReducer';
import type { AcpChatItem, AcpSessionUpdate } from '../acpTypes';

/**
 * 依次应用多条更新
 * @param updates - 更新列表
 * @returns 归并后的条目
 */
function run(updates: AcpSessionUpdate[]): AcpChatItem[] {
  return updates.reduce<AcpChatItem[]>((items, update) => reduceAcpUpdate(items, update), []);
}

const text = (sessionUpdate: string, value: string): AcpSessionUpdate => ({
  sessionUpdate,
  content: { type: 'text', text: value },
});

describe('reduceAcpUpdate', () => {
  it('merges consecutive message chunks into one agent item', () => {
    const items = run([text('agent_message_chunk', 'Hel'), text('agent_message_chunk', 'lo')]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'agent', text: 'Hello' });
  });

  it('starts a new agent item after a tool call interrupts the text', () => {
    const items = run([
      text('agent_message_chunk', 'before'),
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'ls', status: 'pending' },
      text('agent_message_chunk', 'after'),
    ]);
    expect(items.map((item) => item.kind)).toEqual(['agent', 'tool', 'agent']);
  });

  it('keeps thoughts separate from answer text', () => {
    const items = run([text('agent_thought_chunk', 'thinking'), text('agent_message_chunk', 'answer')]);
    expect(items.map((item) => item.kind)).toEqual(['thought', 'agent']);
  });

  it('attaches agent image chunks to the agent item', () => {
    const items = run([
      text('agent_message_chunk', 'see:'),
      { sessionUpdate: 'agent_message_chunk', content: { type: 'image', data: 'AAAA', mimeType: 'image/png' } },
    ]);
    expect(items[0]).toMatchObject({ kind: 'agent', text: 'see:', images: [{ data: 'AAAA', mimeType: 'image/png' }] });
  });

  it('merges tool_call_update into the existing tool call by id', () => {
    const items = run([
      { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read file', kind: 'read', status: 'pending' },
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 't1',
        status: 'completed',
        content: [{ type: 'content', content: { type: 'text', text: 'file body' } }],
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'tool',
      title: 'Read file',
      toolKind: 'read',
      status: 'completed',
      detail: 'file body',
    });
  });

  it('creates a tool item from an update that arrives before its tool_call', () => {
    const items = run([{ sessionUpdate: 'tool_call_update', toolCallId: 'late', status: 'in_progress' }]);
    expect(items[0]).toMatchObject({ kind: 'tool', toolCallId: 'late', status: 'in_progress' });
  });

  it('replaces the plan in place instead of appending another one', () => {
    const items = run([
      { sessionUpdate: 'plan', entries: [{ content: 'a', status: 'pending', priority: 'high' }] },
      text('agent_message_chunk', 'x'),
      { sessionUpdate: 'plan', entries: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'pending' }] },
    ]);
    const plans = items.filter((item) => item.kind === 'plan');
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ entries: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'pending' }] });
  });

  it('summarises diffs by path and truncates very long tool output', () => {
    const long = 'x'.repeat(2000);
    const items = run([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 'd',
        title: 'edit',
        content: [{ type: 'diff', path: 'a.ts', oldText: '', newText: 'y' }],
      },
      { sessionUpdate: 'tool_call', toolCallId: 'o', title: 'run', content: [{ type: 'content', content: { type: 'text', text: long } }] },
    ]);
    expect(items[0]).toMatchObject({ detail: 'a.ts' });
    const detail = (items[1] as { detail: string }).detail;
    expect(detail.length).toBeLessThan(700);
    expect(detail.endsWith('…')).toBe(true);
  });

  it('ignores unrelated updates and does not mutate its input', () => {
    const start: AcpChatItem[] = [{ kind: 'agent', id: 'acp-0', text: 'a', images: [] }];
    const frozen = Object.freeze([...start]) as AcpChatItem[];
    expect(reduceAcpUpdate(frozen, { sessionUpdate: 'usage_update', used: 1 })).toBe(frozen);
    expect(reduceAcpUpdate(frozen, { sessionUpdate: 'available_commands_update' })).toBe(frozen);
    const next = reduceAcpUpdate(frozen, text('agent_message_chunk', 'b'));
    expect(next[0]).toMatchObject({ text: 'ab' });
    expect(frozen[0]).toMatchObject({ text: 'a' });
  });

  it('treats unknown tool statuses as pending', () => {
    const items = run([{ sessionUpdate: 'tool_call', toolCallId: 'z', title: 't', status: 'weird' }]);
    expect(items[0]).toMatchObject({ status: 'pending' });
  });
});
