/**
 * Spaced repetition (Leitner boxes).
 *
 * Every answered question becomes a review item. A mistake sends it to box 0,
 * which is due right away ("работа над ошибками"). Each correct review moves it
 * to the next box, and higher boxes come back less often.
 */
import { addDays, daysBetween, type DayKey } from './dates';

/** Days until the next review after landing in box N. */
export const BOX_INTERVALS = [0, 2, 4, 8, 16, 32] as const;
export const MAX_BOX = BOX_INTERVALS.length - 1;
export const WORKOUT_SIZE = 10;

export interface ReviewItem {
  questionId: string;
  lessonId: string;
  box: number;
  due: DayKey;
  /** How many times the question was answered wrong. */
  lapses: number;
}

export type ReviewItems = Record<string, ReviewItem>;

export interface AnswerRecord {
  questionId: string;
  lessonId: string;
  correct: boolean;
}

/** Updates review items with answers given during a regular lesson. */
export function applyLessonAnswers(
  items: ReviewItems,
  answers: AnswerRecord[],
  today: DayKey,
): ReviewItems {
  const next = { ...items };
  for (const a of answers) {
    const existing = next[a.questionId];
    if (!a.correct) {
      next[a.questionId] = {
        questionId: a.questionId,
        lessonId: a.lessonId,
        box: 0,
        due: today,
        lapses: (existing?.lapses ?? 0) + 1,
      };
    } else if (!existing) {
      next[a.questionId] = {
        questionId: a.questionId,
        lessonId: a.lessonId,
        box: 1,
        due: addDays(today, BOX_INTERVALS[1]),
        lapses: 0,
      };
    } else if (existing.box === 0) {
      next[a.questionId] = { ...existing, box: 1, due: addDays(today, BOX_INTERVALS[1]) };
    }
  }
  return next;
}

/** Updates review items with answers given during a review workout. */
export function applyReviewAnswers(
  items: ReviewItems,
  answers: AnswerRecord[],
  today: DayKey,
): ReviewItems {
  const next = { ...items };
  for (const a of answers) {
    const item = next[a.questionId] ?? {
      questionId: a.questionId,
      lessonId: a.lessonId,
      box: 0,
      due: today,
      lapses: 0,
    };
    if (a.correct) {
      const box = Math.min(item.box + 1, MAX_BOX);
      next[a.questionId] = { ...item, box, due: addDays(today, BOX_INTERVALS[box]) };
    } else {
      next[a.questionId] = { ...item, box: 0, due: addDays(today, 1), lapses: item.lapses + 1 };
    }
  }
  return next;
}

export function isDue(item: ReviewItem, today: DayKey): boolean {
  return daysBetween(item.due, today) >= 0;
}

export function dueItems(items: ReviewItems, today: DayKey): ReviewItem[] {
  return Object.values(items)
    .filter(i => isDue(i, today))
    .sort((a, b) => a.box - b.box || daysBetween(b.due, a.due) || b.lapses - a.lapses);
}

/** Questions answered wrong most often, for the "weak spots" view. */
export function weakItems(items: ReviewItems, limit = 10): ReviewItem[] {
  return Object.values(items)
    .filter(i => i.lapses > 0)
    .sort((a, b) => a.box - b.box || b.lapses - a.lapses)
    .slice(0, limit);
}

export interface WorkoutPlan {
  /** Question ids in the order they should be asked. */
  questionIds: string[];
  /** Subset of questionIds that were due (only these earn review XP). */
  dueIds: string[];
}

/**
 * Picks questions for a workout: due items first, then the least-known items
 * as extra practice so the workout is never empty once lessons were completed.
 */
export function planWorkout(items: ReviewItems, today: DayKey, size = WORKOUT_SIZE): WorkoutPlan {
  const due = dueItems(items, today).slice(0, size);
  const dueIds = due.map(i => i.questionId);
  const extra = Object.values(items)
    .filter(i => !dueIds.includes(i.questionId))
    .sort((a, b) => a.box - b.box || daysBetween(b.due, a.due))
    .slice(0, size - due.length)
    .map(i => i.questionId);
  return { questionIds: [...dueIds, ...extra], dueIds };
}
