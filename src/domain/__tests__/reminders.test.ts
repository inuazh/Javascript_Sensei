import { initialProgress, type ProgressState } from '../progress';
import { planReminders, plural } from '../reminders';

const at = (iso: string) => new Date(iso);
const time = { hour: 19, minute: 0 };

describe('planReminders', () => {
  it('skips today after activity and plans the next days', () => {
    const progress: ProgressState = {
      ...initialProgress,
      streak: { current: 4, longest: 4, lastActiveDay: '2026-11-04', freezes: 0 },
    };
    const plan = planReminders(progress, time, at('2026-11-04T10:00:00'));
    expect(plan).toHaveLength(6);
    expect(plan[0].date.getDate()).toBe(5);
    expect(plan[0].date.getHours()).toBe(19);
    expect(plan[0].title).toContain('Стрик 4 дня под угрозой');
  });

  it('reminds today when not active yet, but not in the past', () => {
    expect(planReminders(initialProgress, time, at('2026-11-04T10:00:00'))[0].date.getDate()).toBe(
      4,
    );
    expect(planReminders(initialProgress, time, at('2026-11-04T20:00:00'))[0].date.getDate()).toBe(
      5,
    );
  });

  it('does not count review items whose question is gone', () => {
    const item = (questionId: string) => ({
      questionId,
      lessonId: 'l1',
      box: 0,
      due: '2026-11-04',
      lapses: 1,
    });
    const progress: ProgressState = {
      ...initialProgress,
      review: { q1: item('q1'), gone: item('gone') },
    };
    const now = at('2026-11-04T10:00:00');
    expect(planReminders(progress, time, now)[0].body).toMatch(/^2 вопроса ждут/);
    expect(planReminders(progress, time, now, id => id !== 'gone')[0].body).toMatch(
      /^1 вопрос ждёт/,
    );
  });
});

describe('plural', () => {
  it('handles Russian plural forms', () => {
    const f = (n: number) => plural(n, 'день', 'дня', 'дней');
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map(f)).toEqual([
      'день',
      'дня',
      'дней',
      'дней',
      'дней',
      'день',
      'дня',
      'дней',
      'дней',
    ]);
  });
});
