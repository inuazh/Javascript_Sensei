import {
  createLessonSession,
  LESSON_SESSION_MAX_AGE_MS,
  resumeLessonSession,
  type LessonSession,
} from '../lessonSession';
import { sanitizeLessonSession } from '../persistence';

const lesson = {
  id: 'variables-01',
  questions: [{ id: 'variables-01-q1' }, { id: 'variables-01-q2' }, { id: 'variables-01-q3' }],
};
const answers = [
  { questionId: 'variables-01-q1', lessonId: 'variables-01', correct: true },
  { questionId: 'variables-01-q2', lessonId: 'variables-01', correct: false },
];
const savedAt = new Date('2026-11-04T10:00:00.000Z');
const later = (ms: number) => new Date(savedAt.getTime() + ms);

describe('createLessonSession', () => {
  it('saves the lesson questions, the answers and where to continue', () => {
    expect(createLessonSession(lesson, answers, savedAt)).toEqual({
      lessonId: 'variables-01',
      questionIds: ['variables-01-q1', 'variables-01-q2', 'variables-01-q3'],
      answers: [
        { questionId: 'variables-01-q1', correct: true },
        { questionId: 'variables-01-q2', correct: false },
      ],
      index: 2,
      savedAt: '2026-11-04T10:00:00.000Z',
    });
  });
});

describe('resumeLessonSession', () => {
  const session = createLessonSession(lesson, answers, savedAt);

  it('continues the same lesson after a save and a reload', () => {
    // What storage gives back after a reload goes through the sanitizer.
    const restored = sanitizeLessonSession(JSON.parse(JSON.stringify(session)));
    expect(resumeLessonSession(restored, lesson, later(60_000))).toEqual(answers);
  });

  it('continues a lesson whose every question was answered (finished before the reload)', () => {
    const all = [
      ...answers,
      { questionId: 'variables-01-q3', lessonId: 'variables-01', correct: true },
    ];
    const done = createLessonSession(lesson, all, savedAt);
    expect(resumeLessonSession(done, lesson, savedAt)).toEqual(all);
  });

  it('has nothing to continue without a session or in another lesson', () => {
    expect(resumeLessonSession(null, lesson, savedAt)).toBeNull();
    expect(resumeLessonSession(session, { ...lesson, id: 'variables-02' }, savedAt)).toBeNull();
  });

  it('starts over after about a day', () => {
    expect(resumeLessonSession(session, lesson, later(LESSON_SESSION_MAX_AGE_MS))).not.toBeNull();
    expect(resumeLessonSession(session, lesson, later(LESSON_SESSION_MAX_AGE_MS + 1))).toBeNull();
  });

  it('starts over when the lesson questions changed', () => {
    const changed = (ids: string[]) => ({ id: lesson.id, questions: ids.map(id => ({ id })) });
    // A question added, removed, replaced or moved.
    for (const ids of [
      ['variables-01-q1', 'variables-01-q2', 'variables-01-q3', 'variables-01-q4'],
      ['variables-01-q1', 'variables-01-q2'],
      ['variables-01-q1', 'variables-01-q9', 'variables-01-q3'],
      ['variables-01-q2', 'variables-01-q1', 'variables-01-q3'],
    ]) {
      expect(resumeLessonSession(session, changed(ids), savedAt)).toBeNull();
    }
  });

  it('starts over when the session does not add up', () => {
    const odd: LessonSession[] = [
      { ...session, answers: [], index: 0 },
      { ...session, index: 1 },
      { ...session, answers: [...session.answers].reverse() },
      { ...session, savedAt: 'not a date' },
    ];
    for (const s of odd) expect(resumeLessonSession(s, lesson, savedAt)).toBeNull();
  });
});
