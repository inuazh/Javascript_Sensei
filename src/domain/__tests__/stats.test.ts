import type { LessonProgress, ProgressState } from '../progress';
import type { ReviewItem } from '../review';
import {
  buildContentLookup,
  computeSectionStats,
  placeOf,
  type StatsContent,
  type StatsTopic,
} from '../stats';

/** Two lessons per topic, two questions per lesson: `${lesson}-q0`, `${lesson}-q1`. */
const topic = (id: string, title: string, lessons: string[]): StatsTopic => ({
  id,
  title,
  lessonIds: lessons,
  questionIds: lessons.flatMap(l => [`${l}-q0`, `${l}-q1`]),
});

const content: StatsContent = {
  sections: [
    {
      id: 'basics',
      title: 'Основы',
      topics: [
        topic('variables', 'Переменные', ['v1', 'v2']),
        topic('types', 'Типы данных', ['t1', 't2']),
      ],
    },
    {
      id: 'async',
      title: 'Асинхронность',
      topics: [topic('promises', 'Промисы', ['p1', 'p2']), topic('await', 'async/await', ['a1'])],
    },
    { id: 'algo', title: 'Алгоритмы', topics: [topic('sort', 'Сортировка', ['s1', 's2'])] },
  ],
};

const ISO = '2026-11-04T12:00:00.000Z';
const taken = (bestCorrect: number, total = 5): LessonProgress => ({
  bestCorrect,
  total,
  stars: 0,
  attempts: 1,
  firstCompletedAt: ISO,
  lastCompletedAt: ISO,
});
const skipped: LessonProgress = { ...taken(0, 0), attempts: 0, skipped: true };

const item = (questionId: string, box: number, lapses: number, lessonId?: string): ReviewItem => ({
  questionId,
  lessonId: lessonId ?? questionId.replace(/-q\d+$/, ''),
  box,
  due: '2026-11-04',
  lapses,
});

const progress = (
  lessons: Record<string, LessonProgress>,
  review: ReviewItem[] = [],
): Pick<ProgressState, 'lessons' | 'review'> => ({
  lessons,
  review: Object.fromEntries(review.map(r => [r.questionId, r])),
});

const section = (summary: ReturnType<typeof computeSectionStats>, id: string) =>
  summary.sections.find(s => s.sectionId === id)!;

describe('computeSectionStats', () => {
  it('returns empty stats for a fresh user', () => {
    const summary = computeSectionStats(progress({}), content);
    expect(summary.sections).toHaveLength(3);
    expect(summary.started).toEqual([]);
    expect(summary.notStartedCount).toBe(3);
    expect(summary.lessonsTaken).toBe(0);
    expect(summary.strongest).toBeNull();
    expect(summary.weakest).toBeNull();
    expect(summary.insight).toBeNull();
    expect(section(summary, 'basics')).toMatchObject({
      number: 1,
      lessonsDone: 0,
      lessonsTotal: 4,
      lessonsTaken: 0,
      accuracy: null,
      percent: null,
      low: false,
      inReview: 0,
      mastered: 0,
      mistakes: 0,
      weakestTopic: null,
      focusTopicId: 'variables',
      started: false,
    });
    expect(section(summary, 'async')).toMatchObject({ number: 2, lessonsTotal: 3 });
  });

  it('computes a partially done section', () => {
    const summary = computeSectionStats(
      progress({ v1: taken(5), v2: taken(3) }, [
        item('v1-q0', 4, 0),
        item('v1-q1', 5, 1),
        item('v2-q0', 0, 2),
        item('v2-q1', 1, 0),
      ]),
      content,
    );
    const basics = section(summary, 'basics');
    expect(basics).toMatchObject({
      lessonsDone: 2,
      lessonsTotal: 4,
      lessonsTaken: 2,
      accuracy: 0.8,
      percent: 80,
      low: false,
      inReview: 4,
      mastered: 2,
      mistakes: 3,
      focusTopicId: 'variables',
      started: true,
    });
    expect(basics.weakestTopic).toMatchObject({ topicId: 'variables', accuracy: 0.8, lapses: 3 });
    expect(summary.started.map(s => s.sectionId)).toEqual(['basics']);
    expect(summary.notStartedCount).toBe(2);
  });

  it('counts skipped lessons as done but leaves them out of accuracy', () => {
    const summary = computeSectionStats(
      progress({ v1: skipped, v2: skipped, t1: taken(2, 4) }),
      content,
    );
    const basics = section(summary, 'basics');
    expect(basics).toMatchObject({
      lessonsDone: 3,
      lessonsTaken: 1,
      accuracy: 0.5,
      percent: 50,
      low: true,
      focusTopicId: 'types',
    });
    // A topic with only skipped lessons has no accuracy and is never the weakest.
    expect(basics.weakestTopic?.topicId).toBe('types');
  });

  it('has no accuracy or weakest topic when everything was skipped', () => {
    const summary = computeSectionStats(progress({ p1: skipped, p2: skipped }), content);
    const asyncStats = section(summary, 'async');
    expect(asyncStats).toMatchObject({
      lessonsDone: 2,
      lessonsTaken: 0,
      accuracy: null,
      percent: null,
      low: false,
      weakestTopic: null,
      focusTopicId: 'promises',
      started: true,
    });
    expect(summary.insight).toBeNull();
  });

  it('picks the topic with the lowest accuracy, ties → most lapses', () => {
    const summary = computeSectionStats(
      progress({ v1: taken(4), t1: taken(4) }, [item('v1-q0', 0, 1), item('t1-q0', 0, 3)]),
      content,
    );
    expect(section(summary, 'basics').weakestTopic).toMatchObject({
      topicId: 'types',
      accuracy: 0.8,
      lapses: 3,
    });

    const lower = computeSectionStats(
      progress({ v1: taken(3), t1: taken(4) }, [item('t1-q0', 0, 5)]),
      content,
    );
    expect(section(lower, 'basics').weakestTopic?.topicId).toBe('variables');
  });

  it('keeps the first topic on a full tie', () => {
    const summary = computeSectionStats(progress({ v1: taken(4), t1: taken(4) }), content);
    expect(section(summary, 'basics').focusTopicId).toBe('variables');
  });

  it('sums best results over lessons with different lengths', () => {
    const summary = computeSectionStats(progress({ p1: taken(6, 6), a1: taken(1, 4) }), content);
    expect(section(summary, 'async')).toMatchObject({ accuracy: 0.7, percent: 70, low: false });
  });

  it('flags accuracy below 70% after rounding', () => {
    const summary = computeSectionStats(progress({ p1: taken(2, 3) }), content);
    expect(section(summary, 'async')).toMatchObject({ percent: 67, low: true });
  });

  it('starts a section with review items only (a daily challenge mistake)', () => {
    const summary = computeSectionStats(progress({}, [item('s1-q1', 0, 1)]), content);
    expect(section(summary, 'algo')).toMatchObject({
      started: true,
      lessonsDone: 0,
      accuracy: null,
      inReview: 1,
      mistakes: 1,
    });
  });

  it('maps review items by lesson when the question is unknown and ignores the rest', () => {
    const summary = computeSectionStats(
      progress({ zz: taken(5) }, [item('old-q', 0, 2, 'p1'), item('gone-q', 0, 9, 'gone')]),
      content,
    );
    expect(section(summary, 'async')).toMatchObject({ inReview: 1, mistakes: 2 });
    expect(summary.sections.reduce((sum, s) => sum + s.inReview, 0)).toBe(1);
    expect(summary.lessonsTaken).toBe(0);
  });

  describe('strongest and weakest section', () => {
    it('needs at least three taken lessons', () => {
      const two = computeSectionStats(progress({ v1: taken(5), p1: taken(2) }), content);
      expect(two.strongest).toBeNull();
      expect(two.weakest).toBeNull();
      expect(two.insight).toBeNull();

      const withSkipped = computeSectionStats(
        progress({ v1: taken(5), p1: taken(2), v2: skipped, t1: skipped }),
        content,
      );
      expect(withSkipped.insight).toBeNull();
    });

    it('names the weak section to tighten up', () => {
      const summary = computeSectionStats(
        progress({ v1: taken(5), v2: taken(4), p1: taken(3) }),
        content,
      );
      expect(summary.strongest?.sectionId).toBe('basics');
      expect(summary.weakest?.sectionId).toBe('async');
      expect(summary.insight).toEqual({ kind: 'weakest', section: summary.weakest });
    });

    it('praises the strongest section when nothing is weak', () => {
      const summary = computeSectionStats(
        progress({ v1: taken(5), v2: taken(5), p1: taken(4) }),
        content,
      );
      expect(summary.weakest?.sectionId).toBe('async');
      expect(summary.insight).toEqual({ kind: 'strongest', section: summary.strongest });
      expect(summary.insight?.section.sectionId).toBe('basics');
    });

    it('with one rated section, praises it or asks to tighten it up', () => {
      const good = computeSectionStats(
        progress({ v1: taken(5), v2: taken(4), t1: taken(5) }),
        content,
      );
      expect(good.strongest?.sectionId).toBe('basics');
      expect(good.weakest).toBeNull();
      expect(good.insight?.kind).toBe('strongest');

      const bad = computeSectionStats(
        progress({ v1: taken(2), v2: taken(3), t1: taken(1) }),
        content,
      );
      expect(bad.insight).toMatchObject({ kind: 'weakest', section: { sectionId: 'basics' } });
    });

    it('breaks ties: strongest has more lessons, weakest has more mistakes', () => {
      const summary = computeSectionStats(
        progress({ v1: taken(4), p1: taken(4), a1: taken(4), s1: taken(4) }, [
          item('s1-q0', 0, 2),
          item('v1-q0', 0, 1),
        ]),
        content,
      );
      expect(summary.strongest?.sectionId).toBe('async');
      expect(summary.weakest?.sectionId).toBe('algo');
    });

    it('breaks a full tie by course order', () => {
      const summary = computeSectionStats(
        progress({ v1: taken(4), p1: taken(4), s1: taken(4) }),
        content,
      );
      expect(summary.strongest?.sectionId).toBe('basics');
      expect(summary.weakest?.sectionId).toBe('async');
    });
  });
});

describe('content lookup', () => {
  const lookup = buildContentLookup(content);

  it('finds the section and topic of a question', () => {
    expect(placeOf(lookup, { questionId: 'a1-q1', lessonId: 'a1' })).toEqual({
      sectionId: 'async',
      sectionTitle: 'Асинхронность',
      sectionNumber: 2,
      topicId: 'await',
      topicTitle: 'async/await',
    });
  });

  it('falls back to the lesson, then gives up', () => {
    expect(placeOf(lookup, { questionId: 'x', lessonId: 's2' })?.sectionId).toBe('algo');
    expect(placeOf(lookup, { questionId: 'x', lessonId: 'y' })).toBeUndefined();
  });
});
