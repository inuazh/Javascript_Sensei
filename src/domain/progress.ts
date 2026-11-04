/**
 * The learner's progress and the pure functions that update it.
 * The zustand store only persists this state and calls these functions,
 * so all the rules here are unit-tested without React.
 */
import { newlyUnlocked, type Achievement, type AchievementStats } from './achievements';
import { dailyStreak, type DailyResults } from './daily';
import { toDayKey, weekDays, type DayKey } from './dates';
import { getLevelInfo } from './levels';
import {
  applyLessonAnswers,
  applyReviewAnswers,
  type AnswerRecord,
  type ReviewItems,
} from './review';
import { XP, lessonXp, starsFor, type Stars } from './rewards';
import { initialStreak, recordActivity, viewStreak, type StreakState } from './streak';

export interface LessonProgress {
  bestCorrect: number;
  total: number;
  stars: Stars;
  attempts: number;
  firstCompletedAt: string;
  lastCompletedAt: string;
  /**
   * Marked as known by the placement test without being taken. Counts as done
   * for the course path, but not for XP, stars or achievements.
   */
  skipped?: boolean;
}

export interface DayActivity {
  xp: number;
  lessons: number;
  reviews: number;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  totalXp: number;
  activity: Record<DayKey, DayActivity>;
  streak: StreakState;
  /** Achievement id -> ISO time it was unlocked. */
  achievements: Record<string, string>;
  review: ReviewItems;
  workoutsCompleted: number;
  mistakesFixed: number;
  lastWorkoutDay: DayKey | null;
  /** «Задача дня» results by the day of the challenge. */
  daily: DailyResults;
}

export const initialProgress: ProgressState = {
  lessons: {},
  totalXp: 0,
  activity: {},
  streak: initialStreak,
  achievements: {},
  review: {},
  workoutsCompleted: 0,
  mistakesFixed: 0,
  lastWorkoutDay: null,
  daily: {},
};

/** Lesson ids per section, needed for section-wide achievements. */
export interface ContentIndex {
  sections: { id: string; lessonIds: string[] }[];
}

export interface ActivityContext {
  now: Date;
  content: ContentIndex;
  dailyGoalXp: number;
}

export interface ActivityOutcome {
  xpEarned: number;
  achievementXp: number;
  achievements: Achievement[];
  levelBefore: number;
  levelAfter: number;
  streakDays: number;
  streakExtended: boolean;
  freezesUsed: number;
  freezesEarned: number;
  dailyGoalXp: number;
  todayXpBefore: number;
  todayXpAfter: number;
  /** The daily goal was reached by this activity. */
  goalReached: boolean;
}

export interface LessonOutcome extends ActivityOutcome {
  stars: Stars;
  firstCompletion: boolean;
  improved: boolean;
}

export interface WorkoutOutcome extends ActivityOutcome {
  correct: number;
  total: number;
  mistakesFixed: number;
  firstWorkoutToday: boolean;
}

export interface DailyOutcome extends ActivityOutcome {
  correct: boolean;
  /** Solved challenges in a row, including this one. */
  dailyStreak: number;
  /** The challenge of that day had already been answered; nothing changed. */
  alreadyDone: boolean;
}

// ─── Selectors ──────────────────────────────────────────────────────────────

export function todayActivity(state: ProgressState, today: DayKey): DayActivity {
  return state.activity[today] ?? { xp: 0, lessons: 0, reviews: 0 };
}

export function isLessonCompleted(state: ProgressState, lessonId: string): boolean {
  return lessonId in state.lessons;
}

/** XP earned during the week containing `today` (Mon..Sun). */
export function weeklyXp(state: ProgressState, today: DayKey): number {
  return weekDays(today).reduce((sum, d) => sum + (state.activity[d]?.xp ?? 0), 0);
}

export function computeStats(
  state: ProgressState,
  content: ContentIndex,
  now: Date,
): AchievementStats {
  const today = toDayKey(now);
  const lessons = Object.values(state.lessons).filter(l => !l.skipped);
  const taken = (id: string) => id in state.lessons && !state.lessons[id].skipped;
  const sectionDone = content.sections.filter(
    s => s.lessonIds.length > 0 && s.lessonIds.every(taken),
  );
  return {
    lessonsCompleted: lessons.length,
    perfectLessons: lessons.filter(l => l.stars === 3).length,
    streakDays: viewStreak(state.streak, today).days,
    level: getLevelInfo(state.totalXp).level,
    lessonsToday: todayActivity(state, today).lessons,
    hour: now.getHours(),
    sectionsCompleted: sectionDone.length,
    sectionsMastered: sectionDone.filter(s =>
      s.lessonIds.every(id => state.lessons[id].stars === 3),
    ).length,
    workoutsCompleted: state.workoutsCompleted,
    mistakesFixed: state.mistakesFixed,
  };
}

// ─── Updates ────────────────────────────────────────────────────────────────

function addActivity(
  state: ProgressState,
  today: DayKey,
  delta: Partial<DayActivity>,
): ProgressState {
  const day = todayActivity(state, today);
  return {
    ...state,
    totalXp: state.totalXp + (delta.xp ?? 0),
    activity: {
      ...state.activity,
      [today]: {
        xp: day.xp + (delta.xp ?? 0),
        lessons: day.lessons + (delta.lessons ?? 0),
        reviews: day.reviews + (delta.reviews ?? 0),
      },
    },
  };
}

/** Streak, achievements and outcome bookkeeping shared by lessons and workouts. */
function finishActivity(
  before: ProgressState,
  afterActivity: ProgressState,
  xpEarned: number,
  ctx: ActivityContext,
): { state: ProgressState; outcome: ActivityOutcome } {
  const today = toDayKey(ctx.now);
  const streak = recordActivity(afterActivity.streak, today);
  let state: ProgressState = { ...afterActivity, streak: streak.state };

  // Achievement rewards can unlock level achievements, so check until stable.
  const unlocked: Achievement[] = [];
  let achievementXp = 0;
  for (let i = 0; i < 3; i++) {
    const fresh = newlyUnlocked(computeStats(state, ctx.content, ctx.now), state.achievements);
    if (fresh.length === 0) break;
    const reward = fresh.reduce((sum, a) => sum + a.xpReward, 0);
    achievementXp += reward;
    unlocked.push(...fresh);
    state = addActivity(
      {
        ...state,
        achievements: {
          ...state.achievements,
          ...Object.fromEntries(fresh.map(a => [a.id, ctx.now.toISOString()])),
        },
      },
      today,
      { xp: reward },
    );
  }

  const todayXpBefore = todayActivity(before, today).xp;
  const todayXpAfter = todayActivity(state, today).xp;
  return {
    state,
    outcome: {
      xpEarned,
      achievementXp,
      achievements: unlocked,
      levelBefore: getLevelInfo(before.totalXp).level,
      levelAfter: getLevelInfo(state.totalXp).level,
      streakDays: state.streak.current,
      streakExtended: streak.extended,
      freezesUsed: streak.freezesUsed,
      freezesEarned: streak.freezesEarned,
      dailyGoalXp: ctx.dailyGoalXp,
      todayXpBefore,
      todayXpAfter,
      goalReached: todayXpBefore < ctx.dailyGoalXp && todayXpAfter >= ctx.dailyGoalXp,
    },
  };
}

export interface LessonResultInput {
  lessonId: string;
  answers: AnswerRecord[];
}

export function completeLesson(
  state: ProgressState,
  input: LessonResultInput,
  ctx: ActivityContext,
): { state: ProgressState; outcome: LessonOutcome } {
  const today = toDayKey(ctx.now);
  const total = input.answers.length;
  const correct = input.answers.filter(a => a.correct).length;
  const stars = starsFor(correct, total);
  const stored = state.lessons[input.lessonId];
  // A lesson skipped by the placement test is taken for the first time now.
  const previous = stored && !stored.skipped ? stored : undefined;
  const xpEarned = lessonXp(correct, total, previous ? previous.bestCorrect : null);
  const nowIso = ctx.now.toISOString();

  const lesson: LessonProgress = previous
    ? {
        bestCorrect: Math.max(previous.bestCorrect, correct),
        total,
        stars: Math.max(previous.stars, stars) as Stars,
        attempts: previous.attempts + 1,
        firstCompletedAt: previous.firstCompletedAt,
        lastCompletedAt: nowIso,
      }
    : {
        bestCorrect: correct,
        total,
        stars,
        attempts: 1,
        firstCompletedAt: nowIso,
        lastCompletedAt: nowIso,
      };

  const updated = addActivity(
    {
      ...state,
      lessons: { ...state.lessons, [input.lessonId]: lesson },
      review: applyLessonAnswers(state.review, input.answers, today),
    },
    today,
    { xp: xpEarned, lessons: 1 },
  );
  const { state: next, outcome } = finishActivity(state, updated, xpEarned, ctx);
  return {
    state: next,
    outcome: {
      ...outcome,
      stars,
      firstCompletion: !previous,
      improved: !!previous && correct > previous.bestCorrect,
    },
  };
}

export interface WorkoutResultInput {
  answers: AnswerRecord[];
  /** Questions that were due when the workout was planned. */
  dueIds: string[];
}

export function completeWorkout(
  state: ProgressState,
  input: WorkoutResultInput,
  ctx: ActivityContext,
): { state: ProgressState; outcome: WorkoutOutcome } {
  const today = toDayKey(ctx.now);
  const due = new Set(input.dueIds);
  const correct = input.answers.filter(a => a.correct);
  const correctDue = correct.filter(a => due.has(a.questionId)).length;
  const fixed = correct.filter(a => (state.review[a.questionId]?.box ?? 1) === 0).length;
  // The daily bonus is for reviewing what was due, not for free practice.
  const firstWorkoutToday = state.lastWorkoutDay !== today && input.dueIds.length > 0;
  const xpEarned =
    correctDue * XP.perCorrectReview + (firstWorkoutToday ? XP.dailyWorkoutBonus : 0);

  const updated = addActivity(
    {
      ...state,
      review: applyReviewAnswers(state.review, input.answers, today),
      workoutsCompleted: state.workoutsCompleted + 1,
      mistakesFixed: state.mistakesFixed + fixed,
      lastWorkoutDay: today,
    },
    today,
    { xp: xpEarned, reviews: input.answers.length },
  );
  const { state: next, outcome } = finishActivity(state, updated, xpEarned, ctx);
  return {
    state: next,
    outcome: {
      ...outcome,
      correct: correct.length,
      total: input.answers.length,
      mistakesFixed: fixed,
      firstWorkoutToday,
    },
  };
}

export interface DailyResultInput {
  /** The day the challenge belongs to (it may be finished after midnight). */
  day: DayKey;
  questionId: string;
  lessonId: string;
  correct: boolean;
}

/**
 * Records the one attempt at the daily challenge. Any answer counts as activity
 * for the streak; a correct one pays XP.dailyChallenge, a wrong one sends the
 * question to spaced repetition like a lesson mistake.
 */
export function completeDaily(
  state: ProgressState,
  input: DailyResultInput,
  ctx: ActivityContext,
): { state: ProgressState; outcome: DailyOutcome } {
  const today = toDayKey(ctx.now);
  const daily = state.daily ?? {};
  const previous = daily[input.day];
  if (previous) {
    const { outcome } = finishActivity(state, state, 0, ctx);
    return {
      state,
      outcome: {
        ...outcome,
        streakExtended: false,
        correct: previous.correct,
        dailyStreak: dailyStreak(daily, input.day),
        alreadyDone: true,
      },
    };
  }

  const xpEarned = input.correct ? XP.dailyChallenge : 0;
  const results: DailyResults = {
    ...daily,
    [input.day]: { questionId: input.questionId, correct: input.correct },
  };
  const review = input.correct ? state.review : applyLessonAnswers(state.review, [input], today);
  const updated = addActivity({ ...state, daily: results, review }, today, { xp: xpEarned });
  const { state: next, outcome } = finishActivity(state, updated, xpEarned, ctx);
  return {
    state: next,
    outcome: {
      ...outcome,
      correct: input.correct,
      dailyStreak: dailyStreak(results, input.day),
      alreadyDone: false,
    },
  };
}

/**
 * Marks lessons as known after the placement test. Already taken lessons are
 * left as they are. No XP, streak or achievements: nothing was learned here.
 */
export function skipLessons(state: ProgressState, lessonIds: string[], now: Date): ProgressState {
  const nowIso = now.toISOString();
  const lessons = { ...state.lessons };
  for (const id of lessonIds) {
    if (lessons[id]) continue;
    lessons[id] = {
      bestCorrect: 0,
      total: 0,
      stars: 0,
      attempts: 0,
      firstCompletedAt: nowIso,
      lastCompletedAt: nowIso,
      skipped: true,
    };
  }
  return { ...state, lessons };
}
