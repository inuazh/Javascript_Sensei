import { planWorkout } from '../../domain/review';
import { LEVEL_SKIPS } from '../../domain/placement';
import {
  getDailyQuestion,
  getLevelPlacement,
  getQuestion,
  getSection,
  questionExists,
} from '../repository';

describe('content repository', () => {
  it('knows which questions exist in the bundled content', () => {
    expect(questionExists('variables-01-q1')).toBe(true);
    expect(questionExists('removed-01-q1')).toBe(false);
  });

  it('keeps review items of removed questions out of a workout', () => {
    const item = (questionId: string) => ({
      questionId,
      lessonId: 'variables-01',
      box: 0,
      due: '2026-11-01',
      lapses: 1,
    });
    const review = {
      'removed-01-q1': item('removed-01-q1'),
      'variables-01-q1': item('variables-01-q1'),
    };
    const plan = planWorkout(review, '2026-11-04', { exists: questionExists });
    expect(plan).toEqual({ questionIds: ['variables-01-q1'], dueIds: ['variables-01-q1'] });
  });

  it('picks an existing output question as the daily challenge', () => {
    const daily = getDailyQuestion('2026-11-04');
    expect(daily?.question.type).toBe('output');
    expect(getQuestion(daily!.question.id)).toBe(daily);
  });

  it('levels skip real sections and leave the rest of the course', () => {
    for (const level of ['intermediate', 'advanced'] as const) {
      for (const id of LEVEL_SKIPS[level]) expect(getSection(id)).toBeDefined();
      const { lessonIds, startSection } = getLevelPlacement(level);
      expect(lessonIds.length).toBeGreaterThan(0);
      expect(startSection).toBeDefined();
      expect(LEVEL_SKIPS[level]).not.toContain(startSection!.id);
    }
    expect(getLevelPlacement('beginner').lessonIds).toEqual([]);
  });
});
