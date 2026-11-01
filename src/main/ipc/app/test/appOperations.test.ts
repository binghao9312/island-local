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
 * @file appOperations.test.ts
 * @description 应用IPC的目录筛选、文件对话框、保存、窗口和哈希行为测试。
 * @author 鸡哥
 */

import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, mocks, root, directories, events, window, entry, invoke } from './appHarness';

beforeEach(resetHarness);
afterEach(cleanupHarness);

describe('app directory search through registered IPC', () => {
  it('skips hidden and excluded directories, filters extensions and handles Buffer names', async () => {
    directories.set(root, [entry('.hidden.txt'), entry('node_modules', true), entry('src', true), entry(Buffer.from('README.TXT')), entry('readme.js'), entry('cache', true)]);
    directories.set(`${root  }\\src`, [entry('readme.txt')]);
    directories.set(`${root  }\\cache`, [entry('readme.txt')]);
    expect(await invoke('app:search-local-files', root, 'readme', { extensions: [' .TXT ', '', 'txt'], excludeDirs: [' cache '], includeDirectories: false })).toEqual([
      { name: 'README.TXT', path: `${root  }\\README.TXT`, isDirectory: false },
      { name: 'readme.txt', path: `${root  }\\src\\readme.txt`, isDirectory: false },
    ]);
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual([root, `${root  }\\src`]);
  });
  it('includes hidden matches when enabled and enforces the depth boundary', async () => {
    directories.set(root, [entry('.secret.txt'), entry('src', true)]);
    directories.set(`${root  }\\src`, [entry('deep', true), entry('note.txt')]);
    directories.set(`${root  }\\src\\deep`, [entry('note.txt')]);
    const result = await invoke('app:search-local-files', root, '.txt', { includeHidden: true, maxDepth: 1 });
    expect(result).toEqual([
      { name: '.secret.txt', path: `${root  }\\.secret.txt`, isDirectory: false },
      { name: 'note.txt', path: `${root  }\\src\\note.txt`, isDirectory: false },
    ]);
    expect(mocks.readdir).not.toHaveBeenCalledWith(`${root  }\\src\\deep`, expect.anything());
  });
  it.each([
    { matchMode: 'startsWith', keyword: 'read', expected: ['read.txt'] },
    { matchMode: 'endsWith', keyword: '.txt', expected: ['read.txt'] },
    { matchMode: 'exact', keyword: 'read.txt', expected: ['read.txt'] },
  ])('applies case-sensitive $matchMode matching', async ({ matchMode, keyword, expected }) => {
    directories.set(root, [entry('read.txt'), entry('READ.TXT'), entry('archive.txt.old')]);
    const result = await invoke('app:search-local-files', root, keyword, { matchMode, caseSensitive: true });
    expect(result).toEqual(expected.map((name) => ({ name, path: `${root  }\\${  name}`, isDirectory: false })));
  });
  it('matches full paths and includes only directories when requested', async () => {
    directories.set(root, [entry('src', true), entry('file.txt')]);
    directories.set(`${root  }\\src`, []);
    expect(await invoke('app:search-local-files', root, 'workspace', { matchScope: 'path', includeFiles: false })).toEqual([{ name: 'src', path: `${root  }\\src`, isDirectory: true }]);
  });
  it('honors a numeric limit, avoids failed directories and returns empty for blank inputs', async () => {
    directories.set(root, [entry('denied', true), entry('match.txt'), entry('match2.txt')]);
    expect(await invoke('app:search-local-files', root, 'match', 1)).toEqual([{ name: 'match.txt', path: `${root  }\\match.txt`, isDirectory: false }]);
    expect(mocks.readdir).toHaveBeenCalledOnce();
    expect(await invoke('app:search-local-files', root, 'absent')).toEqual([]);
    expect(mocks.readdir).toHaveBeenCalledWith(`${root  }\\denied`, { withFileTypes: true });
    mocks.readdir.mockClear();
    expect(await invoke('app:search-local-files', '', 'match')).toEqual([]);
    expect(await invoke('app:search-local-files', root, ' ')).toEqual([]);
    expect(mocks.readdir).not.toHaveBeenCalled();
  });
});

describe('file dialog, read, save and hash IPC responses', () => {
  it.each(['app:pick-local-search-directory', 'app:pick-feedback-screenshot-file', 'app:pick-feedback-log-file', 'app:pick-file-for-hash'])('returns selection and handles cancellation, absent windows and dialog failures for %s', async (channel) => {
    expect(await invoke(channel)).toBe(`${root  }\\chosen.log`);
    mocks.openDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await invoke(channel)).toBeNull();
    mocks.ownerWindow.mockReturnValue(null);
    expect(await invoke(channel)).toBeNull();
    mocks.focusedWindow.mockReturnValue(window);
    mocks.openDialog.mockRejectedValue(new Error('dialog failed'));
    expect(await invoke(channel)).toBeNull();
  });
  it('sanitizes save filters, writes the chosen file and reveals it', async () => {
    expect(await invoke('app:save-text-file', { content: '你好', defaultPath: ' export.md ', filters: [null, 7, {}, { name: ' ', extensions: ['md'] }, { name: ' Markdown ', extensions: ['md', '', 3] }] })).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, { title: '保存文件', defaultPath: 'export.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\saved.txt`, '你好', 'utf8');
    expect(mocks.reveal).toHaveBeenCalledWith(`${root  }\\saved.txt`);
  });
  it('uses save defaults and returns distinct cancellation and failure responses', async () => {
    expect(await invoke('app:save-text-file', null)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, { title: '保存文件', defaultPath: 'eIsland-export.txt', filters: undefined });
    expect(mocks.write).toHaveBeenCalledWith(`${root  }\\saved.txt`, '', 'utf8');
    mocks.saveDialog.mockResolvedValue({ canceled: true });
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: true, filePath: null });
    mocks.saveDialog.mockResolvedValue({ canceled: false, filePath: `${root  }\\saved.txt` });
    mocks.write.mockRejectedValue(new Error('disk full'));
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: false, filePath: null });
    mocks.ownerWindow.mockReturnValue(null);
    expect(await invoke('app:save-text-file', {})).toEqual({ ok: false, canceled: false, filePath: null });
  });
  it('copies a saved image and guards cancellation, missing files and copy errors', async () => {
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: true, canceled: false, filePath: `${root  }\\saved.txt` });
    expect(mocks.saveDialog).toHaveBeenCalledWith(window, expect.objectContaining({ defaultPath: 'image.png' }));
    expect(mocks.copy).toHaveBeenCalledWith(`${root  }\\image.png`, `${root  }\\saved.txt`);
    mocks.saveDialog.mockResolvedValue({ canceled: true });
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: true, filePath: null });
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: false, filePath: null });
    expect(await invoke('app:save-image-as', '')).toEqual({ ok: false, canceled: false, filePath: null });
    mocks.exists.mockReturnValue(true);
    mocks.saveDialog.mockResolvedValue({ canceled: false, filePath: `${root  }\\saved.txt` });
    mocks.copy.mockRejectedValue(new Error('denied'));
    expect(await invoke('app:save-image-as', `${root  }\\image.png`)).toEqual({ ok: false, canceled: false, filePath: null });
  });
  it.each([
    { algorithm: 'sha256', hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { algorithm: 'unsupported', hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { algorithm: 'md5', hash: '900150983cd24fb0d6963f7d28e17f72' },
  ])('hashes actual fixture chunks for $algorithm without reading the filesystem', async ({ algorithm, hash }) => {
    expect(await invoke('app:compute-file-hash', `${root  }\\abc.txt`, algorithm)).toEqual({ hash, algorithm: algorithm === 'unsupported' ? 'sha256' : algorithm, fileName: 'abc.txt', fileSize: 3 });
    expect(mocks.stream).toHaveBeenCalledWith(`${root  }\\abc.txt`);
  });
  it('returns null for absent paths, missing files and stat errors before hashing', async () => {
    expect(await invoke('app:compute-file-hash', '', 'sha256')).toBeNull();
    mocks.exists.mockReturnValue(false);
    expect(await invoke('app:compute-file-hash', `${root  }\\a`, 'sha256')).toBeNull();
    mocks.exists.mockReturnValue(true);
    mocks.stat.mockRejectedValue(new Error('missing'));
    expect(await invoke('app:compute-file-hash', `${root  }\\a`, 'sha256')).toBeNull();
    expect(mocks.stream).not.toHaveBeenCalled();
  });
  it('dispatches local window events and respects destroyed windows', () => {
    events.get('window:minimize')?.({ sender: {} });
    events.get('window:close')?.({ sender: {} });
    events.get('window:maximize')?.({ sender: {} });
    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.close).toHaveBeenCalledOnce();
    expect(window.maximize).toHaveBeenCalledOnce();
    vi.mocked(window.isMaximized).mockReturnValue(true);
    events.get('window:maximize')?.({ sender: {} });
    expect(window.unmaximize).toHaveBeenCalledOnce();
    vi.mocked(window.isDestroyed).mockReturnValue(true);
    ['window:minimize', 'window:close', 'window:maximize'].forEach((channel) => { events.get(channel)?.({ sender: {} }); });
    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.close).toHaveBeenCalledOnce();
    expect(window.maximize).toHaveBeenCalledOnce();
    expect(window.unmaximize).toHaveBeenCalledOnce();
  });
});

describe('app hash stream and zero-depth regressions', () => {
  it.each([
    { maxDepth: 0, expectedPaths: [`${root  }\\match.txt`], expectedDirectories: [root] },
    { maxDepth: 1, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`], expectedDirectories: [root, `${root  }\\src`] },
    { maxDepth: undefined, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`, `${root  }\\src\\deep\\match.txt`], expectedDirectories: [root, `${root  }\\src`, `${root  }\\src\\deep`] },
    { maxDepth: Number.NaN, expectedPaths: [`${root  }\\match.txt`, `${root  }\\src\\match.txt`, `${root  }\\src\\deep\\match.txt`], expectedDirectories: [root, `${root  }\\src`, `${root  }\\src\\deep`] },
  ])('searches exactly the allowed directories for maxDepth=$maxDepth', async ({ maxDepth, expectedPaths, expectedDirectories }) => {
    directories.set(root, [entry('match.txt'), entry('src', true)]);
    directories.set(`${root  }\\src`, [entry('match.txt'), entry('deep', true)]);
    directories.set(`${root  }\\src\\deep`, [entry('match.txt')]);
    expect(await invoke('app:search-local-files', root, 'match', { maxDepth, includeDirectories: false })).toEqual(
      expectedPaths.map((path) => ({ path, name: 'match.txt', isDirectory: false })),
    );
    expect(mocks.readdir.mock.calls.map(([path]) => path)).toEqual(expectedDirectories);
  });
  it.each([false, true])('returns null after a stream failure, partialData=%s', async (partialData) => {
    const error = new Error('fixture stream read failed');
    mocks.stream.mockImplementation(() => {
      const stream = new Readable({ read: () => {} });
      queueMicrotask(() => {
        if (partialData) stream.push(Buffer.from('abc'));
        stream.destroy(error);
      });
      return stream;
    });
    await expect(invoke('app:compute-file-hash', `${root  }\\file.txt`, 'sha256')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith('[App] compute-file-hash error:', error);
  });
});
