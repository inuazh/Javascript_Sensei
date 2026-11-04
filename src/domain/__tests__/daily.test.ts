import {
  DAILY_EPOCH,
  dailyHistory,
  dailyNumber,
  dailyShareText,
  dailyStreak,
  pickDailyQuestionId,
  type DailyResults,
} from '../daily';
import { addDays } from '../dates';

const pool = Array.from({ length: 60 }, (_, i) => ({
  id: `q${i}`,
  type: i % 3 === 0 ? 'output' : 'trueFalse',
}));
const outputIds = new Set(pool.filter(q => q.type === 'output').map(q => q.id));

describe('pickDailyQuestionId', () => {
  it('returns the same question for the same day across calls', () => {
    const first = pickDailyQuestionId(pool, '2026-11-12');
    for (let i = 0; i < 5; i++) expect(pickDailyQuestionId(pool, '2026-11-12')).toBe(first);
    // A fresh copy of the same content in the same order gives the same pick.
    expect(
      pickDailyQuestionId(
        pool.map(q => ({ ...q })),
        '2026-11-12',
      ),
    ).toBe(first);
  });

  it('prefers output questions', () => {
    for (let i = 0; i < 30; i++) {
      expect(outputIds.has(pickDailyQuestionId(pool, addDays('2026-11-01', i))!)).toBe(true);
    }
  });

  it('falls back to any question when there are no output questions', () => {
    const noOutput = pool.filter(q => q.type !== 'output');
    expect(pickDailyQuestionId(noOutput, '2026-11-12')).toMatch(/^q\d+$/);
    expect(pickDailyQuestionId([], '2026-11-12')).toBeNull();
  });

  it('spreads different days over the pool', () => {
    const days = Array.from({ length: 60 }, (_, i) => addDays('2026-11-01', i));
    const picks = days.map(d => pickDailyQuestionId(pool, d)!);
    // 20 output questions over 60 days: most of the pool is used, none dominates.
    expect(new Set(picks).size).toBeGreaterThanOrEqual(14);
    const counts = new Map<string, number>();
    for (const p of picks) counts.set(p, (counts.get(p) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(8);
    const repeats = picks.filter((p, i) => i > 0 && p === picks[i - 1]).length;
    expect(repeats).toBeLessThanOrEqual(6);
  });
});

describe('dailyNumber', () => {
  it('counts days from the epoch starting at #1', () => {
    expect(dailyNumber(DAILY_EPOCH)).toBe(1);
    expect(dailyNumber('2026-11-12')).toBe(12);
    expect(dailyNumber('2027-11-01')).toBe(366);
  });
});

const solved = (questionId = 'q') => ({ questionId, correct: true });
const failed = (questionId = 'q') => ({ questionId, correct: false });

describe('dailyStreak', () => {
  it('counts solved days in a row ending today', () => {
    const results: DailyResults = {
      '2026-11-03': solved(),
      '2026-11-04': solved(),
      '2026-11-05': solved(),
    };
    expect(dailyStreak(results, '2026-11-05')).toBe(3);
  });

  it('keeps the series alive while today is still open', () => {
    expect(dailyStreak({ '2026-11-04': solved() }, '2026-11-05')).toBe(1);
  });

  it('is broken by a wrong answer or a missed day', () => {
    expect(dailyStreak({ '2026-11-04': solved(), '2026-11-05': failed() }, '2026-11-05')).toBe(0);
    expect(dailyStreak({ '2026-11-02': solved(), '2026-11-05': solved() }, '2026-11-05')).toBe(1);
    expect(dailyStreak({ '2026-11-03': solved() }, '2026-11-05')).toBe(0);
  });
});

describe('dailyHistory and dailyShareText', () => {
  const results: DailyResults = {
    '2026-11-01': solved('a'),
    '2026-11-02': failed('b'),
    '2026-11-04': solved('c'),
    '2026-11-05': solved('secret-question'),
  };

  it('never reaches before challenge #1 and caps at a week', () => {
    expect(dailyHistory(results, '2026-11-05')).toEqual([
      'solved',
      'failed',
      'missed',
      'solved',
      'solved',
    ]);
    expect(dailyHistory(results, '2026-11-20')).toHaveLength(7);
  });

  it('builds a compact card without the question or the answer', () => {
    const text = dailyShareText(results, '2026-11-05');
    expect(text).toBe(
      ['JS Sensei · Задача дня #5', '🟥⬛⬜🟥🟥 серия 2', '✅ решено с первой попытки'].join('\n'),
    );
    expect(text).not.toContain('secret-question');
  });

  it('says so when the challenge was not solved', () => {
    const lines = dailyShareText({ ...results, '2026-11-06': failed() }, '2026-11-06').split('\n');
    expect(lines[1]).toBe('🟥⬛⬜🟥🟥⬛ серия 0');
    expect(lines[2]).toMatch(/^❌/);
  });
});
