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
 * @file userAccountApiDisabled.test.ts
 * @description 云端与账户总开关关闭时，用户接口不产生任何网络请求的测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request, githubRequest } from '../userAccountApi.client';
import { fetchFeedbackQqGroupConfig } from '../userAccountApi.feedback';
import { uploadUserWallpaper } from '../userAccountApi.wallpaper';
import { uploadUserAvatar } from '../userAccountApi.profile';
import {
  fetchActiveQuestionnaires,
  fetchCurrentQuestionnaire,
  fetchQuestionnaireHistory,
  submitQuestionnaire,
  deleteQuestionnaireHistory,
} from '../../questionnaire/questionnaireApi';

const netFetch = vi.fn();

beforeEach(() => {
  netFetch.mockReset();
  vi.stubGlobal('window', { location: { hostname: 'example.com' }, api: { netFetch } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('userAccountApi with SERVER_FEATURES_ENABLED=false', () => {
  it('request helper makes zero netFetch calls and returns a disabled result', async () => {
    const result = await request('/v1/user/profile');
    expect(result).toEqual({ ok: false, code: -1, message: 'disabled' });

    const githubResult = await githubRequest('/auth/oauth/providers');
    expect(githubResult).toEqual({ ok: false, code: -1, message: 'disabled' });

    expect(netFetch).not.toHaveBeenCalled();
  });

  it('feedback and wallpaper helpers make zero network calls and return disabled results', async () => {
    await expect(fetchFeedbackQqGroupConfig()).resolves.toBeNull();

    const wallpaperResult = await uploadUserWallpaper('token', {
      title: 'wallpaper',
      copyrightDeclared: true,
      original: new File([], 'original.png'),
      thumb320: new File([], 'thumb320.png'),
      thumb720: new File([], 'thumb720.png'),
      thumb1280: new File([], 'thumb1280.png'),
    });
    expect(wallpaperResult).toEqual({ ok: false, code: -1, message: 'disabled' });

    await expect(
      uploadUserAvatar(new File([], 'avatar.png'), 'token', { ticket: 't', randstr: 'r', sign: 's' }),
    ).rejects.toThrow('disabled');

    expect(netFetch).not.toHaveBeenCalled();
  });

  it('questionnaire helpers make zero network calls and return empty/disabled results', async () => {
    await expect(fetchActiveQuestionnaires('token')).resolves.toEqual([]);
    await expect(fetchCurrentQuestionnaire('token')).resolves.toBeNull();

    const historyResult = await fetchQuestionnaireHistory('token');
    expect(historyResult).toEqual({ ok: false, code: -1, message: 'disabled', data: [] });

    const submitResult = await submitQuestionnaire(1, {}, 'token');
    expect(submitResult).toEqual({ ok: false, code: -1, message: 'disabled' });

    const deleteResult = await deleteQuestionnaireHistory('token', 1, 1);
    expect(deleteResult).toEqual({ ok: false, code: -1, message: 'disabled' });

    expect(netFetch).not.toHaveBeenCalled();
  });
});
