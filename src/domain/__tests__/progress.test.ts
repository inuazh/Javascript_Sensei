import {
  completeDaily,
  completeLesson,
  completeWorkout,
  initialProgress,
  skipLessons,
  weeklyXp,
  type ActivityContext,
  type ProgressState,
} from '../progress';
import { lessonResultXp, XP } from '../rewards';

const content = {
  sections: [
    { id: 'basics', lessonIds: ['b1', 'b2'] },
    { id: 'control', lessonIds: ['c1'] },
  ],
};
const ctx = (iso: string, dailyGoalXp = 50): ActivityContext => ({
  now: new Date(iso),
  content,
  dailyGoalXp,
});
const answers = (lessonId: string, pattern: boolean[]) =>
  pattern.map((correct, i) => ({ questionId: `${lessonId}-q${i}`, lessonId, correct }));

const perfect = [true, true, true, true, true];
const twoMistakes = [true, false, true, false, true];

describe('completeLesson', () => {
  it('records the lesson, XP, streak and first achievements', () => {
    const { state, outcome } = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:00:00'),
    );
    expect(state.lessons.b1).toMatchObject({ bestCorrect: 5, stars: 3, attempts: 1 });
    expect(outcome).toMatchObject({
      stars: 3,
      firstCompletion: true,
      xpEarned: lessonResultXp(5, 5),
      streakDays: 1,
      streakExtended: true,
      goalReached: true,
    });
    expect(outcome.achievements.map(a => a.id)).toEqual(
      expect.arrayContaining(['first_lesson', 'perfect_lesson']),
    );
    expect(state.totalXp).toBe(outcome.xpEarned + outcome.achievementXp);
    expect(state.activity['2026-11-04']).toEqual({
      xp: state.totalXp,
      lessons: 1,
      reviews: 0,
    });
  });

  it('gives no XP for replaying with the same result', () => {
    const first = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:00:00'),
    ).state;
    const { state, outcome } = completeLesson(
      first,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:10:00'),
    );
    expect(outcome.xpEarned).toBe(0);
    expect(outcome.achievementXp).toBe(0);
    expect(state.totalXp).toBe(first.totalXp);
    expect(state.lessons.b1.attempts).toBe(2);
  });

  it('pays the improvement and keeps the best stars', () => {
    const first = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', twoMistakes) },
      ctx('2026-11-04T12:00:00'),
    );
    expect(first.outcome.stars).toBe(1);
    const second = completeLesson(
      first.state,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:10:00'),
    );
    expect(second.outcome.improved).toBe(true);
    expect(second.outcome.xpEarned).toBe(lessonResultXp(5, 5) - lessonResultXp(3, 5));
    const worse = completeLesson(
      second.state,
      { lessonId: 'b1', answers: answers('b1', twoMistakes) },
      ctx('2026-11-04T12:20:00'),
    );
    expect(worse.state.lessons.b1.stars).toBe(3);
  });

  it('puts mistakes into review', () => {
    const { state } = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', twoMistakes) },
      ctx('2026-11-04T12:00:00'),
    );
    expect(state.review['b1-q1']).toMatchObject({ box: 0, due: '2026-11-04' });
    expect(state.review['b1-q0']).toMatchObject({ box: 1 });
  });

  it('unlocks section achievements', () => {
    let state: ProgressState = initialProgress;
    for (const id of ['b1', 'b2']) {
      state = completeLesson(
        state,
        { lessonId: id, answers: answers(id, perfect) },
        ctx('2026-11-04T12:00:00'),
      ).state;
    }
    expect(Object.keys(state.achievements)).toEqual(
      expect.arrayContaining(['section_complete', 'section_master']),
    );
  });

  it('reports the daily goal only when it is crossed', () => {
    const goal = lessonResultXp(5, 5) + 100;
    const first = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:00:00', goal),
    );
    expect(first.outcome.goalReached).toBe(false);
  });

  it('counts weekly XP from Monday', () => {
    let state = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-01T12:00:00'), // Sunday, previous week
    ).state;
    state = completeLesson(
      state,
      { lessonId: 'b2', answers: answers('b2', perfect) },
      ctx('2026-11-03T12:00:00'),
    ).state;
    expect(weeklyXp(state, '2026-11-04')).toBe(state.activity['2026-11-03'].xp);
  });
});

describe('completeWorkout', () => {
  it('pays for due items, gives a daily bonus once and counts fixed mistakes', () => {
    const afterLesson = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', twoMistakes) },
      ctx('2026-11-04T12:00:00'),
    ).state;
    const workoutAnswers = [
      { questionId: 'b1-q1', lessonId: 'b1', correct: true },
      { questionId: 'b1-q3', lessonId: 'b1', correct: false },
      { questionId: 'b1-q0', lessonId: 'b1', correct: true },
    ];
    const { state, outcome } = completeWorkout(
      afterLesson,
      { answers: workoutAnswers, dueIds: ['b1-q1', 'b1-q3'] },
      ctx('2026-11-04T18:00:00'),
    );
    expect(outcome).toMatchObject({
      correct: 2,
      total: 3,
      mistakesFixed: 1,
      firstWorkoutToday: true,
    });
    expect(outcome.xpEarned).toBe(XP.perCorrectReview + XP.dailyWorkoutBonus);
    expect(state.review['b1-q1'].box).toBe(1);
    expect(state.review['b1-q3']).toMatchObject({ box: 0, due: '2026-11-05' });
    expect(outcome.achievements.map(a => a.id)).toContain('first_workout');

    const again = completeWorkout(
      state,
      { answers: workoutAnswers.slice(2), dueIds: [] },
      ctx('2026-11-04T19:00:00'),
    );
    expect(again.outcome.xpEarned).toBe(0);
  });
});

describe('completeWorkout XP cap', () => {
  it('pays review XP for at most paidReviewsPerDay answers a day', () => {
    const ids = Array.from({ length: XP.paidReviewsPerDay + 5 }, (_, i) => `q${i}`);
    const review = Object.fromEntries(
      ids.map(id => [id, { questionId: id, lessonId: 'b1', box: 0, due: '2026-11-04', lapses: 1 }]),
    );
    const state = { ...initialProgress, review };
    const all = ids.map(id => ({ questionId: id, lessonId: 'b1', correct: true }));
    const first = completeWorkout(
      state,
      { answers: all.slice(0, 15), dueIds: ids.slice(0, 15) },
      ctx('2026-11-04T10:00:00'),
    );
    expect(first.outcome.xpEarned).toBe(15 * XP.perCorrectReview + XP.dailyWorkoutBonus);
    const second = completeWorkout(
      first.state,
      { answers: all.slice(15), dueIds: ids.slice(15) },
      ctx('2026-11-04T11:00:00'),
    );
    // Only the remaining 5 paid answers of the day count.
    expect(second.outcome.xpEarned).toBe((XP.paidReviewsPerDay - 15) * XP.perCorrectReview);
    const nextDay = completeWorkout(
      second.state,
      { answers: all.slice(0, 3), dueIds: ids.slice(0, 3) },
      ctx('2026-11-05T10:00:00'),
    );
    expect(nextDay.outcome.xpEarned).toBe(3 * XP.perCorrectReview + XP.dailyWorkoutBonus);
  });
});

describe('skipLessons', () => {
  it('marks lessons as known without XP, and pays full XP when taken later', () => {
    const now = new Date('2026-11-04T12:00:00');
    const skipped = skipLessons(initialProgress, ['b1', 'b2'], now);
    expect(skipped.totalXp).toBe(0);
    expect(skipped.lessons.b1).toMatchObject({ skipped: true, stars: 0 });

    const { state, outcome } = completeLesson(
      skipped,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T13:00:00'),
    );
    expect(outcome.firstCompletion).toBe(true);
    expect(outcome.xpEarned).toBe(lessonResultXp(5, 5));
    expect(state.lessons.b1.skipped).toBeUndefined();
    // b2 is only skipped, so the section is not "completed" for achievements.
    expect(Object.keys(state.achievements)).not.toContain('section_complete');
  });

  it('keeps lessons that were already taken', () => {
    const taken = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', twoMistakes) },
      ctx('2026-11-04T12:00:00'),
    ).state;
    const after = skipLessons(taken, ['b1'], new Date());
    expect(after.lessons.b1).toBe(taken.lessons.b1);
  });
});

describe('free practice', () => {
  it('pays no daily bonus when nothing was due', () => {
    const afterLesson = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T12:00:00'),
    ).state;
    const { outcome } = completeWorkout(
      afterLesson,
      { answers: [{ questionId: 'b1-q0', lessonId: 'b1', correct: true }], dueIds: [] },
      ctx('2026-11-04T18:00:00'),
    );
    expect(outcome.xpEarned).toBe(0);
    expect(outcome.firstWorkoutToday).toBe(false);
  });

  it('does not use up the daily bonus of a later workout with due questions', () => {
    const afterLesson = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-04T08:00:00'),
    ).state;
    const practice = completeWorkout(
      afterLesson,
      { answers: [{ questionId: 'b1-q0', lessonId: 'b1', correct: true }], dueIds: [] },
      ctx('2026-11-04T09:00:00'),
    ).state;
    // A mistake in the next lesson makes a question due the same day.
    const withMistake = completeLesson(
      practice,
      { lessonId: 'b2', answers: answers('b2', [false, true, true]) },
      ctx('2026-11-04T10:00:00'),
    ).state;
    const { outcome } = completeWorkout(
      withMistake,
      { answers: [{ questionId: 'b2-q0', lessonId: 'b2', correct: true }], dueIds: ['b2-q0'] },
      ctx('2026-11-04T11:00:00'),
    );
    expect(outcome.firstWorkoutToday).toBe(true);
    expect(outcome.xpEarned).toBe(XP.perCorrectReview + XP.dailyWorkoutBonus);
  });
});

describe('lesson content changes', () => {
  it('keeps the best result within the current number of questions', () => {
    const six = [true, true, true, true, true, true];
    const before = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', six) },
      ctx('2026-11-04T12:00:00'),
    ).state;
    // An update removed a question from the lesson.
    const { state } = completeLesson(
      before,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-05T12:00:00'),
    );
    expect(state.lessons.b1).toMatchObject({ bestCorrect: 5, total: 5, stars: 3 });
  });
});

describe('completeDaily', () => {
  const daily = (correct: boolean, day = '2026-11-04') => ({
    day,
    questionId: 'c1-q3',
    lessonId: 'c1',
    correct,
  });

  it('pays XP, counts for the streak and records the day', () => {
    const { state, outcome } = completeDaily(
      initialProgress,
      daily(true),
      ctx('2026-11-04T09:00:00'),
    );
    expect(state.daily).toEqual({ '2026-11-04': { questionId: 'c1-q3', correct: true } });
    expect(outcome).toMatchObject({
      correct: true,
      xpEarned: XP.dailyChallenge,
      streakDays: 1,
      streakExtended: true,
      dailyStreak: 1,
      alreadyDone: false,
    });
    expect(state.totalXp).toBe(XP.dailyChallenge + outcome.achievementXp);
    expect(state.activity['2026-11-04'].xp).toBe(state.totalXp);
    // A solved challenge from an unseen lesson does not flood the review queue.
    expect(state.review).toEqual({});
  });

  it('a wrong answer keeps the streak, pays nothing and goes to spaced repetition', () => {
    const { state, outcome } = completeDaily(
      initialProgress,
      daily(false),
      ctx('2026-11-04T09:00:00'),
    );
    expect(outcome).toMatchObject({ correct: false, xpEarned: 0, streakDays: 1, dailyStreak: 0 });
    expect(state.totalXp).toBe(outcome.achievementXp);
    expect(state.streak.lastActiveDay).toBe('2026-11-04');
    expect(state.review['c1-q3']).toMatchObject({ box: 0, due: '2026-11-04', lapses: 1 });
  });

  it('allows one attempt per day', () => {
    const first = completeDaily(initialProgress, daily(false), ctx('2026-11-04T09:00:00')).state;
    const { state, outcome } = completeDaily(first, daily(true), ctx('2026-11-04T10:00:00'));
    expect(state).toBe(first);
    expect(outcome).toMatchObject({ alreadyDone: true, correct: false, xpEarned: 0 });
  });

  it('reports nothing new for an answered challenge, since nothing is saved', () => {
    const first = completeDaily(initialProgress, daily(true), ctx('2026-11-04T09:00:00')).state;
    // Late at night (night owl) and on the next day (streak +1): neither is saved.
    for (const iso of ['2026-11-04T23:30:00', '2026-11-05T09:00:00']) {
      const { state, outcome } = completeDaily(first, daily(true), ctx(iso));
      expect(state).toBe(first);
      expect(outcome).toMatchObject({
        alreadyDone: true,
        xpEarned: 0,
        achievementXp: 0,
        achievements: [],
        streakDays: first.streak.current,
        streakExtended: false,
        freezesUsed: 0,
        freezesEarned: 0,
        goalReached: false,
      });
      expect(outcome.levelAfter).toBe(outcome.levelBefore);
      expect(outcome.todayXpAfter).toBe(outcome.todayXpBefore);
    }
  });

  it('counts solved days in a row alongside lessons', () => {
    let state = completeLesson(
      initialProgress,
      { lessonId: 'b1', answers: answers('b1', perfect) },
      ctx('2026-11-03T12:00:00'),
    ).state;
    state = completeDaily(state, daily(true, '2026-11-03'), ctx('2026-11-03T13:00:00')).state;
    const { state: next, outcome } = completeDaily(
      state,
      daily(true, '2026-11-04'),
      ctx('2026-11-04T08:00:00'),
    );
    expect(outcome.dailyStreak).toBe(2);
    expect(outcome.streakDays).toBe(2);
    expect(next.lessons.b1.stars).toBe(3);
  });

  it('files an answer given after midnight under the day it was shown', () => {
    const { state } = completeDaily(
      initialProgress,
      daily(true, '2026-11-03'),
      ctx('2026-11-04T00:01:00'),
    );
    expect(Object.keys(state.daily)).toEqual(['2026-11-03']);
    expect(state.activity['2026-11-04'].xp).toBeGreaterThanOrEqual(XP.dailyChallenge);
  });

  it('works on progress saved before the field existed', () => {
    const { daily: _omit, ...old } = initialProgress;
    const { state } = completeDaily(
      old as typeof initialProgress,
      daily(true),
      ctx('2026-11-04T09:00:00'),
    );
    expect(state.daily['2026-11-04'].correct).toBe(true);
  });
});
