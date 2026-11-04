import { addDays, daysBetween, toDayKey, weekDays, weekStart } from '../dates';

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
});
