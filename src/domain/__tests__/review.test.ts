import { addDays, daysBetween } from '../dates';
import {
  applyLessonAnswers,
  applyReviewAnswers,
  countDue,
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
    const plan = planWorkout(items, today, { size: 2 });
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

  it('skips items whose question no longer exists', () => {
    const items = applyLessonAnswers(
      {},
      [a('q1', false), a('gone', false), a('q2', true), a('gone2', true)],
      today,
    );
    items.gone = { ...items.gone, lapses: 3 };
    const exists = (id: string) => !id.startsWith('gone');
    expect(dueItems(items, today, exists).map(i => i.questionId)).toEqual(['q1']);
    expect(countDue(items, today, exists)).toBe(1);
    expect(weakItems(items, 10, exists).map(i => i.questionId)).toEqual(['q1']);
    const plan = planWorkout(items, today, { exists });
    expect(plan.dueIds).toEqual(['q1']);
    expect(plan.questionIds).toEqual(['q1', 'q2']);
  });
});

/** The previous implementation, which compared due dates with daysBetween. */
function referenceDue(items: ReviewItems, day: string) {
  return Object.values(items)
    .filter(i => daysBetween(i.due, day) >= 0)
    .sort((x, y) => x.box - y.box || daysBetween(y.due, x.due) || y.lapses - x.lapses);
}

function referencePlan(items: ReviewItems, day: string, size: number) {
  const due = referenceDue(items, day).slice(0, size);
  const dueIds = due.map(i => i.questionId);
  const extra = Object.values(items)
    .filter(i => !dueIds.includes(i.questionId))
    .sort((x, y) => x.box - y.box || daysBetween(y.due, x.due))
    .slice(0, size - due.length)
    .map(i => i.questionId);
  return { questionIds: [...dueIds, ...extra], dueIds };
}

describe('day key comparison', () => {
  // Deterministic pseudo-random items spread over month and year boundaries.
  let seed = 42;
  const rand = (n: number) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed % n;
  };
  const randomItems = (count: number): ReviewItems => {
    const items: ReviewItems = {};
    for (let i = 0; i < count; i++) {
      const id = `q${i}`;
      items[id] = {
        questionId: id,
        lessonId: 'l1',
        box: rand(6),
        due: addDays('2026-12-20', rand(40) - 20),
        lapses: rand(4),
      };
    }
    return items;
  };

  it('orders and filters exactly like the daysBetween version', () => {
    for (let round = 0; round < 50; round++) {
      const items = randomItems(1 + rand(40));
      const day = addDays('2026-12-20', rand(30) - 15);
      expect(dueItems(items, day)).toEqual(referenceDue(items, day));
      expect(countDue(items, day)).toBe(referenceDue(items, day).length);
      for (const size of [1, 5, 10]) {
        expect(planWorkout(items, day, { size })).toEqual(referencePlan(items, day, size));
      }
    }
  });
});
