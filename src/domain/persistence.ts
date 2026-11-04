/**
 * Runtime validation of the persisted user state.
 *
 * AsyncStorage / localStorage hand back whatever was saved: an older build's
 * shape, a field another version wrote with a different type, or a value
 * damaged by hand. Screens trust the types, so a single bad field could crash
 * them. `sanitizePersistedState` reads the state after the migrations ran and
 * returns a fully typed state:
 *
 * - missing fields (at any depth) get their defaults;
 * - fields with a wrong type are coerced when the meaning is clear (a numeric
 *   string, an unpadded day key) and replaced by the default otherwise;
 * - broken entries of id-keyed records (a lesson, a review item, a day of
 *   activity) are dropped one by one, so the rest of the progress survives.
 *
 * Hand-written instead of zod: zod is only a devDependency used for content
 * types, and shipping it would add a schema library to the app bundle for one
 * check that also has to coerce rather than reject.
 */
import { parseDayKey, type DayKey } from './dates';
import type { LessonSession, LessonSessionAnswer } from './lessonSession';
import {
  initialProgress,
  type DayActivity,
  type LessonProgress,
  type ProgressState,
} from './progress';
import type { DailyResult } from './daily';
import { MAX_BOX, type ReviewItem } from './review';
import type { Stars } from './rewards';
import {
  defaultSettings,
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
  type Settings,
} from './settings';
import { MAX_FREEZES, type StreakState } from './streak';

export interface PersistedState {
  settings: Settings;
  progress: ProgressState;
  /** The unfinished lesson to continue, see src/domain/lessonSession.ts. */
  lessonSession: LessonSession | null;
}

/** Stand-in for a lost timestamp: keeps the record, sorts it first. */
const LOST_TIME = new Date(0).toISOString();
/** Stand-in for a lost review date: the item is simply due now. */
const LOST_DAY: DayKey = '1970-01-01';

type Obj = Record<string, unknown>;

const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const asObject = (v: unknown): Obj => (isObject(v) ? v : {});

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** A finite number (numeric strings are accepted), rounded to an integer and clamped. */
function int(v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Rebuilds an id-keyed record entry by entry. `read` returns undefined for an
 * entry that cannot be repaired; `key` may normalise or reject the key.
 */
function record<T>(
  v: unknown,
  read: (value: unknown, key: string) => T | undefined,
  key: (k: string) => string | null = k => k,
): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObject(v)) return out;
  for (const [rawKey, value] of Object.entries(v)) {
    const k = key(rawKey);
    if (k === null || k === '__proto__') continue;
    const item = read(value, k);
    if (item !== undefined) out[k] = item;
  }
  return out;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export function sanitizeSettings(raw: unknown): Settings {
  const s = asObject(raw);
  const d = defaultSettings;
  const reminder = asObject(s.reminder);
  return {
    onboarded: bool(s.onboarded, d.onboarded),
    dailyGoalXp: int(s.dailyGoalXp, d.dailyGoalXp, 1),
    experience: EXPERIENCE_LEVELS.includes(s.experience as ExperienceLevel)
      ? (s.experience as ExperienceLevel)
      : d.experience,
    nickname: strOrNull(s.nickname),
    playerId: strOrNull(s.playerId),
    soundEnabled: bool(s.soundEnabled, d.soundEnabled),
    hapticsEnabled: bool(s.hapticsEnabled, d.hapticsEnabled),
    reminder: {
      enabled: bool(reminder.enabled, d.reminder.enabled),
      hour: int(reminder.hour, d.reminder.hour, 0, 23),
      minute: int(reminder.minute, d.reminder.minute, 0, 59),
    },
    placementDone: bool(s.placementDone, d.placementDone),
  };
}

// ─── Progress ───────────────────────────────────────────────────────────────

function readLesson(v: unknown): LessonProgress | undefined {
  if (!isObject(v)) return undefined;
  const lesson: LessonProgress = {
    bestCorrect: int(v.bestCorrect, 0),
    total: int(v.total, 0),
    stars: int(v.stars, 0, 0, 3) as Stars,
    attempts: int(v.attempts, 0),
    firstCompletedAt: str(v.firstCompletedAt, LOST_TIME),
    lastCompletedAt: str(v.lastCompletedAt, LOST_TIME),
  };
  if (typeof v.skipped === 'boolean') lesson.skipped = v.skipped;
  return lesson;
}

function readActivity(v: unknown): DayActivity | undefined {
  if (!isObject(v)) return undefined;
  return { xp: int(v.xp, 0), lessons: int(v.lessons, 0), reviews: int(v.reviews, 0) };
}

function readStreak(v: unknown): StreakState {
  const s = asObject(v);
  const d = initialProgress.streak;
  return {
    current: int(s.current, d.current),
    longest: int(s.longest, d.longest),
    lastActiveDay: parseDayKey(s.lastActiveDay),
    freezes: int(s.freezes, d.freezes, 0, MAX_FREEZES),
  };
}

function readReviewItem(v: unknown, questionId: string): ReviewItem | undefined {
  if (!isObject(v)) return undefined;
  return {
    // The record key is what every update uses, so it wins over a stale field.
    questionId,
    lessonId: str(v.lessonId, ''),
    box: int(v.box, 0, 0, MAX_BOX),
    due: parseDayKey(v.due) ?? LOST_DAY,
    lapses: int(v.lapses, 0),
  };
}

function readDailyResult(v: unknown): DailyResult | undefined {
  if (!isObject(v) || typeof v.questionId !== 'string' || typeof v.correct !== 'boolean') {
    return undefined;
  }
  return { questionId: v.questionId, correct: v.correct };
}

export function sanitizeProgress(raw: unknown): ProgressState {
  const p = asObject(raw);
  const d = initialProgress;
  return {
    lessons: record(p.lessons, readLesson),
    totalXp: int(p.totalXp, d.totalXp),
    activity: record(p.activity, readActivity, parseDayKey),
    streak: readStreak(p.streak),
    // An unlock is kept even if its time is lost, so its XP is not paid twice.
    achievements: record(p.achievements, v => str(v, LOST_TIME)),
    review: record(p.review, readReviewItem),
    workoutsCompleted: int(p.workoutsCompleted, d.workoutsCompleted),
    mistakesFixed: int(p.mistakesFixed, d.mistakesFixed),
    lastWorkoutDay: parseDayKey(p.lastWorkoutDay),
    daily: record(p.daily, readDailyResult, parseDayKey),
  };
}

// ─── Unfinished lesson ──────────────────────────────────────────────────────

function readSessionAnswer(v: unknown): LessonSessionAnswer | undefined {
  if (!isObject(v) || typeof v.questionId !== 'string' || typeof v.correct !== 'boolean') {
    return undefined;
  }
  return { questionId: v.questionId, correct: v.correct };
}

/**
 * The saved lesson session, or null. Unlike the progress it is not repaired:
 * a session with any broken part is dropped and the lesson starts over, which
 * costs a few answers at most. Whether it still fits the lesson content is
 * checked when the lesson opens (resumeLessonSession).
 */
export function sanitizeLessonSession(raw: unknown): LessonSession | null {
  if (!isObject(raw)) return null;
  const { lessonId, questionIds, answers, index, savedAt } = raw;
  if (typeof lessonId !== 'string' || !lessonId) return null;
  if (!Array.isArray(questionIds) || questionIds.length === 0) return null;
  if (!questionIds.every((id): id is string => typeof id === 'string')) return null;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > questionIds.length) {
    return null;
  }
  const read = answers.map(readSessionAnswer);
  if (read.some((a, i) => a?.questionId !== questionIds[i])) return null;
  if (index !== answers.length) return null;
  if (typeof savedAt !== 'string' || Number.isNaN(new Date(savedAt).getTime())) return null;
  return {
    lessonId,
    questionIds: [...questionIds],
    answers: read as LessonSessionAnswer[],
    index,
    savedAt,
  };
}

/** A complete, well-typed state from whatever storage returned (after migrations). */
export function sanitizePersistedState(raw: unknown): PersistedState {
  const state = asObject(raw);
  return {
    settings: sanitizeSettings(state.settings),
    progress: sanitizeProgress(state.progress),
    lessonSession: sanitizeLessonSession(state.lessonSession),
  };
}
