/* eslint-disable @typescript-eslint/no-require-imports -- modules are re-required with different env */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const entry = {
  id: 'uid-1',
  nickname: 'Alice',
  xp: 120,
  weekXp: 70,
  week: '2026-11-02',
  level: 2,
  streak: 3,
};

function mockFetch(responses: Record<string, unknown>) {
  const calls: { url: string; init?: RequestInit }[] = [];
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

afterEach(() => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
});

describe('leaderboard without auth', () => {
  it('uploads with a server timestamp and no auth token', async () => {
    const { uploadScore } = load('');
    const calls = mockFetch({ '/leaderboard/uid-1.json': null });
    await uploadScore(entry);
    expect(calls[0].url).not.toContain('auth=');
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      nickname: 'Alice',
      updatedAt: { '.sv': 'timestamp' },
    });
  });

  it('parses players, hides legacy entries and ranks weekly', async () => {
    const { fetchPlayers, rankWeekly, rankAllTime } = load('');
    mockFetch({
      'leaderboard.json': {
        a: { nickname: 'Ann', xp: 300, weekXp: 10, week: '2026-11-02', level: 3, streak: 1 },
        b: { nickname: 'Bob', xp: 200, weekXp: 90, week: '2026-11-02', level: 2, streak: 5 },
        c: { nickname: 'Old', xp: 999, weekXp: 999, week: '2026-10-26', level: 9, streak: 0 },
        legacy: { xp: 5000, title: 'Senior Dev', streak: 2 },
      },
    });
    const players = await fetchPlayers();
    expect(players.map(p => p.id).sort()).toEqual(['a', 'b', 'c']);
    expect(rankWeekly(players, '2026-11-02').map(p => p.id)).toEqual(['b', 'a']);
    expect(rankAllTime(players).map(p => p.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('leaderboard with anonymous auth', () => {
  it('signs up once, then writes to its own uid with the token', async () => {
    const { uploadScore, createPlayerId } = load('test-key');
    const calls = mockFetch({
      'accounts:signUp': {
        localId: 'uid-1',
        idToken: 'token-1',
        refreshToken: 'r1',
        expiresIn: '3600',
      },
      '/leaderboard/uid-1.json': null,
    });
    expect(await createPlayerId()).toBe('uid-1');
    await uploadScore(entry);
    expect(calls.filter(c => c.url.includes('signUp'))).toHaveLength(1);
    expect(calls.at(-1)?.url).toContain('auth=token-1');
  });

  it('refuses to write somebody else’s entry', async () => {
    const { uploadScore } = load('test-key');
    mockFetch({
      'accounts:signUp': { localId: 'uid-2', idToken: 't', refreshToken: 'r', expiresIn: '3600' },
    });
    await expect(uploadScore(entry)).rejects.toThrow('does not match');
  });
});
