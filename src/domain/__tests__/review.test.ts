import {
  applyLessonAnswers,
  applyReviewAnswers,
  dueItems,
  planWorkout,
  weakItems,
  type ReviewItems,
} from '../review';

const today = '2026-11-04';
const a = (questionId: string, correct: boolean) => ({ questionId, lessonId: 'l1', correct });

describe('review', () => {
  it('schedules lesson answers: mistakes now, correct answers later', () => {
    const items = applyLessonAnswers({}, [a('q1', false), a('q2', true)], today);
    expect(items.q1).toMatchObject({ box: 0, due: today, lapses: 1 });
    expect(items.q2).toMatchObject({ box: 1, due: '2026-11-06', lapses: 0 });
    expect(dueItems(items, today).map(i => i.questionId)).toEqual(['q1']);
  });

  it('does not reset known items on a correct lesson answer', () => {
    const items: ReviewItems = {
      q1: { questionId: 'q1', lessonId: 'l1', box: 4, due: '2026-12-01', lapses: 0 },
    };
    expect(applyLessonAnswers(items, [a('q1', true)], today).q1.box).toBe(4);
    expect(applyLessonAnswers(items, [a('q1', false)], today).q1).toMatchObject({
      box: 0,
      lapses: 1,
    });
  });

  it('moves items through boxes in reviews', () => {
    let items = applyLessonAnswers({}, [a('q1', false)], today);
    items = applyReviewAnswers(items, [a('q1', true)], today);
    expect(items.q1).toMatchObject({ box: 1, due: '2026-11-06' });
    items = applyReviewAnswers(items, [a('q1', true)], '2026-11-06');
    expect(items.q1).toMatchObject({ box: 2, due: '2026-11-10' });
    items = applyReviewAnswers(items, [a('q1', false)], '2026-11-10');
    expect(items.q1).toMatchObject({ box: 0, due: '2026-11-11', lapses: 2 });
  });

  it('plans workouts with due items first, then practice', () => {
    const items = applyLessonAnswers({}, [a('q1', false), a('q2', true), a('q3', true)], today);
    const plan = planWorkout(items, today, 2);
    expect(plan.dueIds).toEqual(['q1']);
    expect(plan.questionIds).toHaveLength(2);
    expect(plan.questionIds[0]).toBe('q1');
    expect(planWorkout({}, today).questionIds).toEqual([]);
  });

  it('lists weak spots by lapses', () => {
    let items = applyLessonAnswers({}, [a('q1', false), a('q2', false), a('q3', true)], today);
    items = applyLessonAnswers(items, [a('q2', false)], today);
    expect(weakItems(items).map(i => i.questionId)).toEqual(['q2', 'q1']);
  });
});
