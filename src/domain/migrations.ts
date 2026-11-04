/**
 * Versioned migrations of the persisted user state (persist key 'js-sensei-user').
 *
 * MIGRATIONS[n] turns a state saved by store version n into version n + 1.
 * To change the persisted shape incompatibly: bump STORE_VERSION and add the
 * step for the previous version. Fields that only get added with a default
 * need no step: `sanitizePersistedState` (src/domain/persistence.ts) fills in
 * missing fields after the migrations ran.
 */
import { ACHIEVEMENTS_BY_ID } from './achievements';
import { toDayKey } from './dates';
import { initialProgress, type LessonProgress, type ProgressState } from './progress';
import { lessonResultXp, starsFor, type Stars } from './rewards';
import type { ExperienceLevel } from './settings';
import { MAX_FREEZES } from './streak';

export type { ExperienceLevel };

/** Version of the persisted shape written by this build. */
export const STORE_VERSION = 1;

export type Migration = (state: unknown) => unknown;

/** Keyed by the version the state was saved with; each step returns version + 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  /** v0: the first app version, before progress and settings were split. */
  0: state => migrateLegacyState(cleanLegacyState(state)),
};

/**
 * Runs every step from `fromVersion` up to STORE_VERSION. A state saved by a
 * newer build (after a downgrade) is passed through for the sanitizer to read.
 */
export function migratePersistedState(state: unknown, fromVersion: number): unknown {
  let migrated = state;
  for (let v = Math.max(0, fromVersion); v < STORE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from store version ${v}`);
    migrated = step(migrated);
  }
  return migrated;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Drops the parts of a v0 state that would make the migration throw. */
function cleanLegacyState(state: unknown): LegacyUserState {
  if (!isObject(state)) return {};
  const validTime = (t: unknown): t is string =>
    typeof t === 'string' && !Number.isNaN(new Date(t).getTime());
  const lessonResults = Array.isArray(state.lessonResults)
    ? state.lessonResults.filter(
        (r): r is NonNullable<LegacyUserState['lessonResults']>[number] =>
          isObject(r) && typeof r.lessonId === 'string' && validTime(r.completedAt),
      )
    : undefined;
  const topicsProgress: LegacyUserState['topicsProgress'] = {};
  if (isObject(state.topicsProgress)) {
    for (const [id, t] of Object.entries(state.topicsProgress)) {
      if (!isObject(t)) continue;
      topicsProgress[id] = {
        completedLessons: Array.isArray(t.completedLessons)
          ? t.completedLessons.filter((l): l is string => typeof l === 'string')
          : [],
        bestStars: typeof t.bestStars === 'number' ? t.bestStars : undefined,
      };
    }
  }
  const unlockedAchievements = Array.isArray(state.unlockedAchievements)
    ? state.unlockedAchievements.filter(
        (a): a is { id: string; unlockedAt: string } =>
          isObject(a) && typeof a.id === 'string' && typeof a.unlockedAt === 'string',
      )
    : undefined;
  return {
    userProgress: isObject(state.userProgress) ? state.userProgress : undefined,
    topicsProgress,
    lessonResults,
    isOnboarded: state.isOnboarded === true,
    unlockedAchievements,
  };
}

/** Shape of the v0 store, as far as the migration needs it. Everything is optional. */
export interface LegacyUserState {
  userProgress?: {
    totalXp?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastActiveDate?: string;
    dailyGoalMinutes?: number;
    freezesAvailable?: number;
    selectedLevel?: string;
  };
  topicsProgress?: Record<string, { completedLessons?: string[]; bestStars?: number }>;
  lessonResults?: {
    lessonId: string;
    completedAt: string;
    stars?: number;
    correctAnswers?: number;
    totalQuestions?: number;
  }[];
  isOnboarded?: boolean;
  unlockedAchievements?: { id: string; unlockedAt: string }[];
}

export interface MigratedSettings {
  onboarded: boolean;
  dailyGoalXp: number;
  experience: ExperienceLevel;
}

const GOAL_BY_MINUTES: Record<number, number> = { 5: 50, 10: 100, 15: 150 };

export function migrateLegacyState(old: LegacyUserState): {
  progress: ProgressState;
  settings: MigratedSettings;
} {
  const results = old.lessonResults ?? [];
  const lessons: Record<string, LessonProgress> = {};
  const activity: ProgressState['activity'] = {};

  const sorted = [...results].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  for (const r of sorted) {
    const total = r.totalQuestions ?? 5;
    const correct = r.correctAnswers ?? 0;
    const prev = lessons[r.lessonId];
    const day = toDayKey(new Date(r.completedAt));
    activity[day] ??= { xp: 0, lessons: 0, reviews: 0 };
    activity[day].lessons += 1;
    // XP is recalculated with the current rules: only the improvement counts.
    const before = prev ? lessonResultXp(prev.bestCorrect, total) : 0;
    const after = lessonResultXp(Math.max(prev?.bestCorrect ?? 0, correct), total);
    activity[day].xp += Math.max(0, after - before);
    lessons[r.lessonId] = prev
      ? {
          ...prev,
          bestCorrect: Math.max(prev.bestCorrect, correct),
          stars: Math.max(prev.stars, starsFor(correct, total)) as Stars,
          attempts: prev.attempts + 1,
          lastCompletedAt: r.completedAt,
        }
      : {
          bestCorrect: correct,
          total,
          stars: starsFor(correct, total),
          attempts: 1,
          firstCompletedAt: r.completedAt,
          lastCompletedAt: r.completedAt,
        };
  }

  // Lessons marked completed without a stored result.
  for (const topic of Object.values(old.topicsProgress ?? {})) {
    for (const lessonId of topic.completedLessons ?? []) {
      if (lessons[lessonId]) continue;
      const stars = Math.min(3, Math.max(1, topic.bestStars ?? 1)) as Stars;
      lessons[lessonId] = {
        bestCorrect: stars === 3 ? 5 : stars === 2 ? 4 : 3,
        total: 5,
        stars,
        attempts: 1,
        firstCompletedAt: new Date(0).toISOString(),
        lastCompletedAt: new Date(0).toISOString(),
      };
    }
  }

  const lessonXpTotal = Object.values(activity).reduce((sum, d) => sum + d.xp, 0);
  const achievements: Record<string, string> = {};
  for (const a of old.unlockedAchievements ?? []) {
    if (ACHIEVEMENTS_BY_ID[a.id]) achievements[a.id] = a.unlockedAt;
  }
  const achievementXp = Object.keys(achievements).reduce(
    (sum, id) => sum + ACHIEVEMENTS_BY_ID[id].xpReward,
    0,
  );

  const up = old.userProgress ?? {};
  const lastActive = up.lastActiveDate || null;
  const progress: ProgressState = {
    ...initialProgress,
    lessons,
    activity,
    totalXp: lessonXpTotal + achievementXp,
    achievements,
    streak: {
      current: up.currentStreak ?? 0,
      longest: Math.max(up.longestStreak ?? 0, up.currentStreak ?? 0),
      lastActiveDay: lastActive,
      freezes: Math.min(MAX_FREEZES, Math.max(0, up.freezesAvailable ?? 1)),
    },
  };

  const level = up.selectedLevel;
  return {
    progress,
    settings: {
      onboarded: old.isOnboarded ?? false,
      dailyGoalXp: GOAL_BY_MINUTES[up.dailyGoalMinutes ?? 5] ?? 50,
      experience: level === 'intermediate' || level === 'advanced' ? level : 'beginner',
    },
  };
}
