import {
  initialStreak,
  recordActivity,
  streakDeadline,
  viewStreak,
  type StreakState,
} from '../streak';

const s = (over: Partial<StreakState>): StreakState => ({ ...initialStreak, ...over });

describe('streak', () => {
  it('starts at 1 on first activity', () => {
    const r = recordActivity(initialStreak, '2026-11-04');
    expect(r.state).toMatchObject({ current: 1, longest: 1, lastActiveDay: '2026-11-04' });
    expect(r.extended).toBe(true);
  });

  it('is idempotent within a day', () => {
    const once = recordActivity(initialStreak, '2026-11-04').state;
    const twice = recordActivity(once, '2026-11-04');
    expect(twice.state).toBe(once);
    expect(twice.extended).toBe(false);
  });

  it('grows on consecutive days', () => {
    const r = recordActivity(
      s({ current: 4, longest: 4, lastActiveDay: '2026-11-03' }),
      '2026-11-04',
    );
    expect(r.state.current).toBe(5);
  });

  it('uses freezes to cover missed days', () => {
    const r = recordActivity(
      s({ current: 4, longest: 4, lastActiveDay: '2026-11-02', freezes: 1 }),
      '2026-11-04',
    );
    expect(r.state).toMatchObject({ current: 5, freezes: 0 });
    expect(r.freezesUsed).toBe(1);
  });

  it('resets when the gap is longer than the freezes', () => {
    const r = recordActivity(
      s({ current: 10, longest: 10, lastActiveDay: '2026-11-01', freezes: 1 }),
      '2026-11-04',
    );
    expect(r.state).toMatchObject({ current: 1, longest: 10, freezes: 1 });
  });

  it('earns a freeze every 7 days, up to the maximum', () => {
    const r = recordActivity(
      s({ current: 6, lastActiveDay: '2026-11-03', freezes: 0 }),
      '2026-11-04',
    );
    expect(r.state).toMatchObject({ current: 7, freezes: 1 });
    expect(r.freezesEarned).toBe(1);
    const capped = recordActivity(
      s({ current: 13, lastActiveDay: '2026-11-03', freezes: 2 }),
      '2026-11-04',
    );
    expect(capped.state.freezes).toBe(2);
  });

  it('shows the right status for today', () => {
    const state = s({ current: 3, lastActiveDay: '2026-11-04', freezes: 0 });
    expect(viewStreak(state, '2026-11-04')).toEqual({ days: 3, status: 'done' });
    expect(viewStreak(state, '2026-11-05')).toEqual({ days: 3, status: 'pending' });
    expect(viewStreak(state, '2026-11-06')).toEqual({ days: 0, status: 'none' });
    expect(viewStreak({ ...state, freezes: 1 }, '2026-11-06')).toEqual({
      days: 3,
      status: 'pending',
    });
    expect(viewStreak(initialStreak, '2026-11-06')).toEqual({ days: 0, status: 'none' });
  });

  it('knows the last day to keep the streak', () => {
    expect(streakDeadline(s({ current: 3, lastActiveDay: '2026-11-04', freezes: 0 }))).toBe(
      '2026-11-05',
    );
    expect(streakDeadline(s({ current: 3, lastActiveDay: '2026-11-04', freezes: 2 }))).toBe(
      '2026-11-07',
    );
    expect(streakDeadline(initialStreak)).toBeNull();
  });
});
