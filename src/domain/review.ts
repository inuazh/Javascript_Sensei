/**
 * Spaced repetition (Leitner boxes).
 *
 * Every answered question becomes a review item. A mistake sends it to box 0,
 * which is due right away ("работа над ошибками"). Each correct review moves it
 * to the next box, and higher boxes come back less often.
 */
import { addDays, compareDays, type DayKey } from './dates';

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

/**
 * Whether a review item can still be asked. Items whose question was removed
 * from the content are skipped: they never count as due and never reach a
 * workout. Defaults to "everything exists" for pure domain use and tests.
 */
export type QuestionExists = (questionId: string) => boolean;

const anyQuestion: QuestionExists = () => true;

/**
 * Day keys are zero-padded 'YYYY-MM-DD', so they are compared as strings:
 * this runs on every store write (tab badge), where parsing dates was the
 * bottleneck.
 */
export function isDue(item: ReviewItem, today: DayKey): boolean {
  return item.due <= today;
}

/** Due first by box (mistakes first), then the longest overdue, then the most lapses. */
const byUrgency = (a: ReviewItem, b: ReviewItem) =>
  a.box - b.box || compareDays(a.due, b.due) || b.lapses - a.lapses;

export function dueItems(
  items: ReviewItems,
  today: DayKey,
  exists: QuestionExists = anyQuestion,
): ReviewItem[] {
  return Object.values(items)
    .filter(i => i.due <= today && exists(i.questionId))
    .sort(byUrgency);
}

/** Same as `dueItems(...).length`, without sorting. */
export function countDue(
  items: ReviewItems,
  today: DayKey,
  exists: QuestionExists = anyQuestion,
): number {
  let count = 0;
  for (const id in items) {
    const item = items[id];
    if (item.due <= today && exists(item.questionId)) count++;
  }
  return count;
}

/** Questions answered wrong most often, for the "weak spots" view. */
export function weakItems(
  items: ReviewItems,
  limit = 10,
  exists: QuestionExists = anyQuestion,
): ReviewItem[] {
  return Object.values(items)
    .filter(i => i.lapses > 0 && exists(i.questionId))
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
export function planWorkout(
  items: ReviewItems,
  today: DayKey,
  { size = WORKOUT_SIZE, exists = anyQuestion }: { size?: number; exists?: QuestionExists } = {},
): WorkoutPlan {
  const due = dueItems(items, today, exists).slice(0, size);
  const dueIds = due.map(i => i.questionId);
  const taken = new Set(dueIds);
  const extra = Object.values(items)
    .filter(i => !taken.has(i.questionId) && exists(i.questionId))
    .sort((a, b) => a.box - b.box || compareDays(a.due, b.due))
    .slice(0, size - due.length)
    .map(i => i.questionId);
  return { questionIds: [...dueIds, ...extra], dueIds };
}
