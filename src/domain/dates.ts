/**
 * Calendar helpers. All day keys are in the user's local time zone:
 * a lesson at 01:00 in Moscow belongs to that day, not the previous UTC day.
 */

/** 'YYYY-MM-DD' in local time. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** Whole days from `a` to `b` (positive when b is later). DST-safe. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const utc = (key: DayKey) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** Monday of the week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  const dow = fromDayKey(key).getDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

/**
 * The week of `key` as a number: days from 1970-01-01 to its Monday
 * (2026-11-02 → 20759; a Monday is always ≡ 4 mod 7). The leaderboard keeps
 * weekly scores under this number, because database rules can do arithmetic
 * on numbers but cannot parse a date string.
 */
export function weekNumber(key: DayKey): number {
  return daysBetween('1970-01-01', weekStart(key));
}

/** The seven day keys (Mon..Sun) of the week containing `key`. */
export function weekDays(key: DayKey): DayKey[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
