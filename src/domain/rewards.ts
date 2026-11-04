/**
 * XP and stars. XP is only paid for new knowledge: the first completion of a
 * lesson, an improved result on a replay, and spaced-repetition reviews that
 * are due. Replaying a lesson with the same result gives no XP, so the
 * leaderboard cannot be farmed.
 */

export const XP = {
  perCorrectAnswer: 10,
  lessonCompleted: 10,
  perfectLesson: 10,
  perCorrectReview: 5,
  /**
   * Review answers per day that can earn XP. Without a cap, failing a replayed
   * lesson on purpose and fixing it in a workout would farm XP without limit.
   */
  paidReviewsPerDay: 20,
  dailyWorkoutBonus: 20,
  /** Solving «Задача дня». */
  dailyChallenge: 15,
} as const;

export type Stars = 0 | 1 | 2 | 3;

/** 3 stars without mistakes, 2 with one mistake, 1 otherwise. */
export function starsFor(correct: number, total: number): Stars {
  if (total <= 0) return 0;
  const mistakes = total - correct;
  if (mistakes <= 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

/** XP a lesson result is worth on its own. */
export function lessonResultXp(correct: number, total: number): number {
  return (
    correct * XP.perCorrectAnswer +
    XP.lessonCompleted +
    (correct === total && total > 0 ? XP.perfectLesson : 0)
  );
}

/**
 * XP for completing a lesson, given the best previous result (null if never completed).
 * Only the improvement over the previous best is paid.
 */
export function lessonXp(
  correct: number,
  total: number,
  previousBestCorrect: number | null,
): number {
  const now = lessonResultXp(correct, total);
  if (previousBestCorrect === null) return now;
  const before = lessonResultXp(previousBestCorrect, total);
  return Math.max(0, now - before);
}
