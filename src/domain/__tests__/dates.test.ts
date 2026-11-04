import { addDays, daysBetween, toDayKey, weekDays, weekNumber, weekStart } from '../dates';

describe('dates', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 local time on March 5th is still March 5th regardless of time zone.
    expect(toDayKey(new Date(2026, 2, 5, 0, 30))).toBe('2026-03-05');
    expect(toDayKey(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between keys', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30);
  });

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-02'); // Wednesday
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(weekStart('2026-11-02')).toBe('2026-11-02'); // Monday
    expect(weekDays('2026-11-04')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });

  it('numbers weeks by the days from 1970-01-01 to their Monday', () => {
    expect(weekNumber('2026-11-02')).toBe(20759);
    expect(weekNumber('2026-11-08')).toBe(20759);
    expect(weekNumber('2026-11-09')).toBe(20766);
    expect(weekNumber('1970-01-05')).toBe(4); // the first Monday
    expect(weekNumber('2027-01-01')).toBe(weekNumber('2026-12-28'));
  });

  // Mirrors leaderboard → weekly/$week/$uid/week in database.rules.json.
  const DAY = 86_400_000;
  const rulesAccept = (week: number, now: number) =>
    week % 7 === 4 && week * DAY > now - 8 * DAY && week * DAY < now + DAY;

  it('produces a week the database rules accept in every time zone', () => {
    const start = Date.UTC(2026, 10, 1); // Sunday, so both week boundaries are crossed
    for (let offsetH = -12; offsetH <= 14; offsetH++) {
      for (let t = start; t < start + 9 * DAY; t += 15 * 60_000) {
        // The day key a device in UTC+offsetH sees at server time t.
        const local = new Date(t + offsetH * 3_600_000);
        const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
        expect({ key, offsetH, ok: rulesAccept(weekNumber(key), t) }).toEqual({
          key,
          offsetH,
          ok: true,
        });
      }
    }
  });

  it('rejects stale and future weeks in the rules', () => {
    const now = Date.UTC(2026, 10, 4, 12); // Wednesday
    expect(rulesAccept(20759, now)).toBe(true);
    expect(rulesAccept(20752, now)).toBe(false); // last week
    expect(rulesAccept(20766, now)).toBe(false); // next week
    expect(rulesAccept(20760, now)).toBe(false); // not a Monday
  });
});
