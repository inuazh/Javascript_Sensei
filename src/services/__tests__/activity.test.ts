/* eslint-disable @typescript-eslint/no-require-imports -- modules are re-required with a fresh store */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../notifications', () => ({ syncReminders: jest.fn(async () => {}) }));

type Call = { method: string; url: string; body?: unknown; respond: () => void };

/** fetch that answers only when the test calls respond(). */
function deferredFetch() {
  const calls: Call[] = [];
  global.fetch = jest.fn(
    (url: string, init?: RequestInit) =>
      new Promise(resolve => {
        calls.push({
          method: init?.method ?? 'GET',
          url,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          respond: () => resolve({ ok: true, status: 200, json: async () => null } as Response),
        });
      }),
  ) as unknown as typeof fetch;
  return calls;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

async function load() {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const { useUserStore, waitForHydration } =
    require('../../stores/useUserStore') as typeof import('../../stores/useUserStore');
  const activity = require('../activity') as typeof import('../activity');
  await waitForHydration();
  useUserStore.getState().updateSettings({ nickname: 'Alice', playerId: 'player-1' });
  return { ...activity, useUserStore };
}

describe('leaving the leaderboard', () => {
  it('deletes the entry only after an upload already in flight has landed', async () => {
    const { publishScore, leaveLeaderboard } = await load();
    const calls = deferredFetch();

    const publishing = publishScore();
    await flush();
    expect(calls.map(c => c.method)).toEqual(['PATCH']);

    const leaving = leaveLeaderboard();
    await flush();
    // A DELETE sent now could reach the server before the PATCH and the
    // entry would be written back after the user left.
    expect(calls.map(c => c.method)).toEqual(['PATCH']);

    calls[0].respond();
    await publishing;
    await flush();
    expect(calls.map(c => c.method)).toEqual(['PATCH', 'DELETE', 'DELETE', 'DELETE']);
    calls.slice(1).forEach(c => c.respond());
    expect(await leaving).toBe(true);
  });

  it('does not upload a score that was queued before leaving', async () => {
    const { publishScore, leaveLeaderboard } = await load();
    const calls = deferredFetch();

    const first = publishScore();
    await flush();
    const second = publishScore();
    const leaving = leaveLeaderboard();
    await flush();
    calls[0].respond();
    await first;
    await second;
    await flush();
    calls.slice(1).forEach(c => c.respond());
    await leaving;
    expect(calls.map(c => c.method)).toEqual(['PATCH', 'DELETE', 'DELETE', 'DELETE']);
  });
});

describe('publishing the score', () => {
  it('sends uploads one at a time, so an older score never lands last', async () => {
    const { publishScore, useUserStore } = await load();
    const calls = deferredFetch();

    const first = publishScore();
    await flush();
    useUserStore.setState(s => ({ progress: { ...s.progress, totalXp: 50 } }));
    const second = publishScore();
    await flush();
    expect(calls).toHaveLength(1);

    calls[0].respond();
    await first;
    await flush();
    expect(calls).toHaveLength(2);
    expect((calls[1].body as Record<string, { xp: number }>)['leaderboard/player-1'].xp).toBe(50);
    calls[1].respond();
    await second;
  });

  it('still publishes after a failed upload', async () => {
    const { publishScore } = await load();
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(publishScore()).rejects.toThrow('Network request failed');
    const calls = deferredFetch();
    const next = publishScore();
    await flush();
    expect(calls).toHaveLength(1);
    calls[0].respond();
    await next;
  });
});

describe('a request that never answers', () => {
  afterEach(() => jest.useRealTimers());

  it('does not block leaving the leaderboard for good', async () => {
    const { publishScore, leaveLeaderboard } = await load();
    const calls = deferredFetch();
    jest.useFakeTimers();
    void publishScore();
    await jest.advanceTimersByTimeAsync(0);
    expect(calls.map(c => c.method)).toEqual(['PATCH']);

    const leaving = leaveLeaderboard();
    await jest.advanceTimersByTimeAsync(19_000);
    expect(calls.map(c => c.method)).toEqual(['PATCH']);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(calls.map(c => c.method)).toEqual(['PATCH', 'DELETE', 'DELETE', 'DELETE']);
    calls.slice(1).forEach(c => c.respond());
    expect(await leaving).toBe(true);
  });
});
