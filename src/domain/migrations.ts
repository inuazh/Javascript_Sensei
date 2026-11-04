/**
 * Migration of the persisted user state from the first app version
 * (persist key 'js-sensei-user', no version) to ProgressState + Settings.
 */
import { ACHIEVEMENTS_BY_ID } from './achievements';
import { toDayKey } from './dates';
import { initialProgress, type LessonProgress, type ProgressState } from './progress';
import { lessonResultXp, starsFor, type Stars } from './rewards';
import { MAX_FREEZES } from './streak';

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

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

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
