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
 * @file acpChatComponents.test.tsx
 * @description ACP 聊天组件测试：权限面板按钮往返、消息条目渲染与 Markdown 外链安全
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { nodes, render, text } from '../../../../test/componentHarness';
import { AcpMessageItem } from '../AcpMessageItem';
import { AcpMessageList } from '../AcpMessageList';
import { AcpPermissionPrompt } from '../AcpPermissionPrompt';
import { AssistantMarkdown } from '../AssistantMarkdown';

describe('AcpPermissionPrompt', () => {
  const request = {
    requestId: 'omp-perm-1',
    providerId: 'omp' as const,
    title: 'rm -rf build',
    options: [
      { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
      { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
    ],
  };

  it('renders one button per agent option plus a cancel button and reports the chosen option id', () => {
    const onResolve = vi.fn();
    const tree = render(AcpPermissionPrompt, { request, queued: 0, onResolve });
    const buttons = nodes(tree, 'button');
    expect(buttons).toHaveLength(3);
    expect(text(tree)).toContain('rm -rf build');
    (buttons[0].props.onClick as () => void)();
    expect(onResolve).toHaveBeenLastCalledWith('allow_once');
    (buttons[1].props.onClick as () => void)();
    expect(onResolve).toHaveBeenLastCalledWith('reject_once');
    (buttons[2].props.onClick as () => void)();
    expect(onResolve).toHaveBeenLastCalledWith(null);
  });

  it('shows the queue length only when more requests are waiting', () => {
    const onResolve = vi.fn();
    expect(text(render(AcpPermissionPrompt, { request, queued: 0, onResolve }))).not.toContain('acpChat.permission.queued');
    expect(text(render(AcpPermissionPrompt, { request, queued: 2, onResolve }))).toContain('acpChat.permission.queued');
  });
});

describe('AcpMessageItem', () => {
  it('renders user text and attached images as data URLs', () => {
    const html = renderToStaticMarkup(
      <AcpMessageItem item={{ kind: 'user', id: 'a', text: 'look', images: [{ data: 'AAAA', mimeType: 'image/png' }] }} />,
    );
    expect(html).toContain('look');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
  });

  it('renders tool calls with an expandable detail only when output exists', () => {
    const withDetail = render(AcpMessageItem, {
      item: { kind: 'tool', id: 'b', toolCallId: 't', title: 'ls', status: 'completed', detail: 'a.txt' },
    });
    expect(nodes(withDetail, 'details')).toHaveLength(1);
    const plain = render(AcpMessageItem, {
      item: { kind: 'tool', id: 'c', toolCallId: 't', title: 'ls', status: 'failed' },
    });
    expect(nodes(plain, 'details')).toHaveLength(0);
    expect(text(plain)).toContain('ls');
  });

  it('renders thoughts collapsed and errors as alerts', () => {
    const thought = render(AcpMessageItem, { item: { kind: 'thought', id: 'd', text: 'hmm' } });
    expect(nodes(thought, 'details')).toHaveLength(1);
    const error = render(AcpMessageItem, { item: { kind: 'error', id: 'e', text: 'boom' } });
    expect(nodes(error, 'div')[0].props.role).toBe('alert');
  });

  it('renders plan entries', () => {
    const tree = render(AcpMessageItem, {
      item: { kind: 'plan', id: 'f', entries: [{ content: 'step one', status: 'completed' }] },
    });
    expect(text(tree)).toContain('step one');
  });
});

describe('AcpMessageList thinking bubble', () => {
  it('renders three animated dots in an agent bubble when busy and waiting for first reply chunk', () => {
    const tree = render(AcpMessageList, {
      items: [{ kind: 'user', id: 'u1', text: 'hi', images: [] }],
      busy: true,
      emptyContent: null,
    });
    const statusBubble = nodes(tree, 'div').find((node) => node.props?.role === 'status');
    expect(statusBubble).toBeDefined();
    expect(statusBubble?.props?.className).toContain('max-expand-chat-bubble ai');
    const dots = nodes(statusBubble, 'span');
    expect(dots).toHaveLength(3);
  });

  it('does not render thinking bubble once agent reply has arrived', () => {
    const tree = render(AcpMessageList, {
      items: [
        { kind: 'user', id: 'u1', text: 'hi', images: [] },
        { kind: 'agent', id: 'a1', text: 'Hello there!', images: [] },
      ],
      busy: true,
      emptyContent: null,
    });
    const statusBubble = nodes(tree, 'div').find((node) => node.props?.role === 'status');
    expect(statusBubble).toBeUndefined();
  });

  it('does not render thinking bubble when not busy', () => {
    const tree = render(AcpMessageList, {
      items: [{ kind: 'user', id: 'u1', text: 'hi', images: [] }],
      busy: false,
      emptyContent: null,
    });
    const statusBubble = nodes(tree, 'div').find((node) => node.props?.role === 'status');
    expect(statusBubble).toBeUndefined();
  });
});

describe('AssistantMarkdown links', () => {
  it('opens http links in a new window without leaking the opener', () => {
    const html = renderToStaticMarkup(<AssistantMarkdown content="[docs](https://example.com/a)" />);
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('does not render clickable anchors for script or file URLs', () => {
    const html = renderToStaticMarkup(
      <AssistantMarkdown content={'[x](javascript:alert(1)) [y](file:///C:/Windows/win.ini)'} />,
    );
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('javascript:');
  });
});
