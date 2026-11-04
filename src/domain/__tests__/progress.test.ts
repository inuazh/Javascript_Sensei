import {
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
