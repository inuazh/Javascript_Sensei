/* eslint-disable @typescript-eslint/no-require-imports -- modules are re-required with different env */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const score = {
  id: 'uid-1',
  nickname: 'Alice',
  xp: 120,
  weekXp: 70,
  week: 20759,
  streak: 3,
};

type Call = { url: string; init?: RequestInit };

function mockFetch(responses: Record<string, unknown>) {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const key = Object.keys(responses).find(k => url.includes(k));
    return { ok: !!key, status: key ? 200 : 500, json: async () => (key ? responses[key] : null) };
  }) as unknown as typeof fetch;
  return calls;
}

function load(apiKey: string) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = apiKey;
  return require('../leaderboard') as typeof import('../leaderboard');
}

type Storage = typeof import('@react-native-async-storage/async-storage').default;
/** The AsyncStorage mock instance the freshly loaded modules use. */
function storage(): Storage {
  const mod = require('@react-native-async-storage/async-storage');
  return (mod.default ?? mod) as Storage;
}

const DB = 'https://javascript-sensei-default-rtdb.europe-west1.firebasedatabase.app';

afterEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  await storage().clear();
});

describe('leaderboard without auth', () => {
  it('writes the all-time and weekly entries in one multi-path update', async () => {
    const { uploadScore } = load('');
    const calls = mockFetch({ [`${DB}/.json`]: null });
    await uploadScore(score);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${DB}/.json`);
    expect(calls[0].init?.method).toBe('PATCH');
    const updatedAt = { '.sv': 'timestamp' };
    // Exactly the shape database.rules.json accepts: no level, no extra fields.
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      'leaderboard/uid-1': { nickname: 'Alice', xp: 120, streak: 3, updatedAt },
      'weekly/20759/uid-1': {
        nickname: 'Alice',
        xp: 120,
        streak: 3,
        weekXp: 70,
        week: 20759,
        updatedAt,
      },
    });
  });

  it('removes the weekly entry when there is no XP this week', async () => {
    const { uploadScore } = load('');
    const calls = mockFetch({ [`${DB}/.json`]: null });
    await uploadScore({ ...score, weekXp: 0 });
    expect(JSON.parse(String(calls[0].init?.body))['weekly/20759/uid-1']).toBeNull();
  });

  it('reads with the only queries the rules allow', async () => {
    const { fetchAllTime, fetchWeek } = load('');
    const calls = mockFetch({ 'leaderboard.json': {}, 'weekly/20759.json': null });
    await fetchAllTime();
    await fetchWeek(20759);
    expect(calls.map(c => c.url)).toEqual([
      `${DB}/leaderboard.json?orderBy=%22xp%22&limitToLast=200`,
      `${DB}/weekly/20759.json?orderBy=%22weekXp%22&limitToLast=200`,
    ]);
  });

  it('parses players, derives the level and hides legacy entries', async () => {
    const { fetchAllTime, rankAllTime } = load('');
    mockFetch({
      'leaderboard.json': {
        a: { nickname: 'Ann', xp: 300, streak: 1 },
        b: { nickname: 'Bob', xp: 200, streak: 5, level: 99 },
        legacy: { xp: 5000, title: 'Senior Dev', streak: 2 },
      },
    });
    const players = rankAllTime(await fetchAllTime());
    expect(players.map(p => [p.id, p.level])).toEqual([
      ['a', 3],
      ['b', 2],
    ]);
  });

  it('ranks the weekly list by weekXp', async () => {
    const { fetchWeek, rankWeekly } = load('');
    mockFetch({
      'weekly/20759.json': {
        a: { nickname: 'Ann', xp: 300, weekXp: 10, week: 20759, streak: 1 },
        b: { nickname: 'Bob', xp: 200, weekXp: 90, week: 20759, streak: 5 },
        c: { nickname: 'Cat', xp: 50, weekXp: 0, week: 20759, streak: 0 },
      },
    });
    expect(rankWeekly(await fetchWeek(20759)).map(p => p.id)).toEqual(['b', 'a']);
  });

  it('drops malformed entries instead of crashing', async () => {
    const { fetchAllTime, fetchWeek } = load('');
    const good = { nickname: 'Ann', xp: 300, weekXp: 10, streak: 1 };
    mockFetch({
      'leaderboard.json': {
        ok: good,
        nul: null,
        str: 'player',
        arr: [1, 2],
        longName: { ...good, nickname: 'a'.repeat(1_000_000) },
        control: { ...good, nickname: 'Ann‮' },
        reserved: { ...good, nickname: 'Admin' },
        nickNum: { ...good, nickname: 42 },
        xpString: { ...good, xp: '300' },
        xpHuge: { ...good, xp: 1e300 },
        xpNegative: { ...good, xp: -1 },
        xpFraction: { ...good, xp: 1.5 },
        noXp: { nickname: 'Ann' },
        [`x${'y'.repeat(500)}`]: good,
        badCounts: { ...good, weekXp: 1e9, streak: 'long' },
      },
      'weekly/20759.json': [null, good],
    });
    const players = await fetchAllTime();
    expect(players.map(p => p.id)).toEqual(['ok', 'badCounts']);
    expect(players[1]).toMatchObject({ xp: 300, weekXp: 0, streak: 0, level: 3 });
    expect((await fetchWeek(20759)).map(p => p.id)).toEqual(['1']);
  });

  it('survives a response that is not an object', async () => {
    const { fetchAllTime } = load('');
    for (const body of [null, 42, 'text', true]) {
      mockFetch({ 'leaderboard.json': body });
      await expect(fetchAllTime()).resolves.toEqual([]);
    }
  });

  it('deletes the entry and this and last week’s weekly entries', async () => {
    const { deleteScore } = load('');
    const calls = mockFetch({ [DB]: null });
    expect(await deleteScore('uid-1', 20759)).toBe(true);
    expect(calls.map(c => [c.init?.method, c.url])).toEqual([
      ['DELETE', `${DB}/leaderboard/uid-1.json`],
      ['DELETE', `${DB}/weekly/20759/uid-1.json`],
      ['DELETE', `${DB}/weekly/20752/uid-1.json`],
    ]);
  });

  it('reports a failed delete instead of throwing', async () => {
    const { deleteScore } = load('');
    global.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await deleteScore('uid-1', 20759)).toBe(false);
  });
});

describe('leaderboard with anonymous auth', () => {
  const signUp = {
    'accounts:signUp': {
      localId: 'uid-1',
      idToken: 'token-1',
      refreshToken: 'r1',
      expiresIn: '3600',
    },
  };

  it('signs up once, then writes to its own uid with the token', async () => {
    const { uploadScore, createPlayerId } = load('test-key');
    const calls = mockFetch({ ...signUp, [`${DB}/.json`]: null });
    expect(await createPlayerId()).toBe('uid-1');
    await uploadScore(score);
    expect(calls.filter(c => c.url.includes('signUp'))).toHaveLength(1);
    expect(calls.at(-1)?.url).toBe(`${DB}/.json?auth=token-1`);
  });

  it('deletes with the token', async () => {
    const { deleteScore } = load('test-key');
    const calls = mockFetch({ ...signUp, [DB]: null });
    expect(await deleteScore('uid-1', 20759)).toBe(true);
    const deletes = calls.filter(c => c.init?.method === 'DELETE');
    expect(deletes).toHaveLength(3);
    expect(deletes.every(c => c.url.endsWith('.json?auth=token-1'))).toBe(true);
  });

  it('refuses to write or delete somebody else’s entry', async () => {
    const { uploadScore, deleteScore } = load('test-key');
    const calls = mockFetch({
      'accounts:signUp': { localId: 'uid-2', idToken: 't', refreshToken: 'r', expiresIn: '3600' },
    });
    await expect(uploadScore(score)).rejects.toThrow('does not match');
    expect(await deleteScore('uid-1', 20759)).toBe(false);
    expect(calls.filter(c => c.url.startsWith(DB))).toHaveLength(0);
  });

  it('discards a corrupt saved session and signs up again', async () => {
    const { createPlayerId } = load('test-key');
    await storage().setItem('js-sensei-auth', '{not json');
    const calls = mockFetch(signUp);
    expect(await createPlayerId()).toBe('uid-1');
    expect(calls.map(c => c.url.split('?')[0])).toEqual([
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp',
    ]);
    expect(JSON.parse((await storage().getItem('js-sensei-auth')) ?? '')).toEqual({
      uid: 'uid-1',
      refreshToken: 'r1',
    });
  });

  it('discards a saved session without a refresh token', async () => {
    const { createPlayerId } = load('test-key');
    await storage().setItem('js-sensei-auth', '"just a string"');
    const calls = mockFetch(signUp);
    expect(await createPlayerId()).toBe('uid-1');
    expect(calls.some(c => c.url.includes('securetoken'))).toBe(false);
  });

  it('refreshes a valid saved session instead of signing up', async () => {
    const { createPlayerId } = load('test-key');
    await storage().setItem('js-sensei-auth', JSON.stringify({ uid: 'uid-9', refreshToken: 'r9' }));
    const calls = mockFetch({
      securetoken: { id_token: 't9', refresh_token: 'r10', user_id: 'uid-9', expires_in: '3600' },
    });
    expect(await createPlayerId()).toBe('uid-9');
    expect(calls).toHaveLength(1);
  });
});
