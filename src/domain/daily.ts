/**
 * «Задача дня»: one question per calendar day, the same for everyone.
 *
 * The question is picked by rendezvous hashing of the local day key and the
 * question id, so every device with the same content shows the same challenge
 * on the same date without a server, and adding content does not reshuffle
 * the future days.
 * One attempt per day; results are kept in progress state by day key.
 */
import { addDays, daysBetween, type DayKey } from './dates';

/** Day of challenge #1. */
export const DAILY_EPOCH: DayKey = '2026-11-01';

/** How many recent days the share card shows. */
export const SHARE_HISTORY_DAYS = 7;

export interface DailyResult {
  questionId: string;
  correct: boolean;
}

export type DailyResults = Record<DayKey, DailyResult>;

export interface DailyCandidate {
  id: string;
  type: string;
}

/** «Задача дня #N»: #1 on DAILY_EPOCH, counting up by one every day. */
export function dailyNumber(day: DayKey): number {
  return daysBetween(DAILY_EPOCH, day) + 1;
}

/** 32-bit FNV-1a with a final avalanche, so neighbouring keys land far apart. */
export function hashString(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * The question of the day. «Что выведет код?» questions are preferred: they
 * make the best puzzles.
 *
 * Rendezvous (highest random weight) hashing: every candidate gets the score
 * hash(day + ':' + id) and the highest score wins. Unlike `hash(day) % length`,
 * adding a question changes a day's pick only when the new question itself
 * scores highest (about 1 day in pool size), removing a question only changes
 * the days it had won, and the order of the content does not matter.
 */
export function pickDailyQuestionId(candidates: DailyCandidate[], day: DayKey): string | null {
  const outputs = candidates.filter(c => c.type === 'output');
  const pool = outputs.length > 0 ? outputs : candidates;
  let best: string | null = null;
  let bestScore = -1;
  for (const { id } of pool) {
    const score = hashString(`${day}:${id}`);
    // Ties (practically never) go to the smaller id, so candidate order never matters.
    if (score > bestScore || (score === bestScore && best !== null && id < best)) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Consecutive solved challenges ending today, or ending yesterday while today's
 * is still open. A wrong answer or a missed day ends the series.
 */
export function dailyStreak(results: DailyResults, today: DayKey): number {
  let day = results[today] ? today : addDays(today, -1);
  let count = 0;
  while (results[day]?.correct) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export type DailyMark = 'solved' | 'failed' | 'missed';

/** Recent challenges up to `today`, oldest first; never reaches before #1. */
export function dailyHistory(
  results: DailyResults,
  today: DayKey,
  days = SHARE_HISTORY_DAYS,
): DailyMark[] {
  const count = Math.max(0, Math.min(days, dailyNumber(today)));
  return Array.from({ length: count }, (_, i) => {
    const r = results[addDays(today, i - count + 1)];
    return r ? (r.correct ? 'solved' : 'failed') : 'missed';
  });
}

const MARK_EMOJI: Record<DailyMark, string> = { solved: '🟥', failed: '⬛', missed: '⬜' };

/** Text card for sharing. Shows how it went, never the question or the answer. */
export function dailyShareText(results: DailyResults, today: DayKey): string {
  const result = results[today];
  const streak = dailyStreak(results, today);
  const history = dailyHistory(results, today)
    .map(m => MARK_EMOJI[m])
    .join('');
  return [
    `JS Sensei · Задача дня #${dailyNumber(today)}`,
    `${history} серия ${streak}`,
    result?.correct ? '✅ решено с первой попытки' : '❌ не сегодня — завтра новая',
  ].join('\n');
}
