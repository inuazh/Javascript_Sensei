import { compareDays, parseDayKey } from '../dates';
import { MIGRATIONS, STORE_VERSION, migratePersistedState } from '../migrations';
import type { LessonSession } from '../lessonSession';
import {
  sanitizeLessonSession,
  sanitizePersistedState,
  sanitizeProgress,
  sanitizeSettings,
} from '../persistence';
import { initialProgress, type ProgressState } from '../progress';
import { defaultSettings, type Settings } from '../settings';

const validSettings: Settings = {
  onboarded: true,
  dailyGoalXp: 100,
  experience: 'advanced',
  nickname: 'neo',
  playerId: 'p-1',
  soundEnabled: false,
  hapticsEnabled: true,
  reminder: { enabled: true, hour: 8, minute: 30 },
  placementDone: true,
};

const validProgress: ProgressState = {
  lessons: {
    'variables-01': {
      bestCorrect: 4,
      total: 5,
      stars: 2,
      attempts: 2,
      firstCompletedAt: '2026-11-01T10:00:00.000Z',
      lastCompletedAt: '2026-11-02T10:00:00.000Z',
    },
    'variables-02': {
      bestCorrect: 0,
      total: 0,
      stars: 0,
      attempts: 0,
      firstCompletedAt: '2026-11-01T10:00:00.000Z',
      lastCompletedAt: '2026-11-01T10:00:00.000Z',
      skipped: true,
    },
  },
  totalXp: 230,
  activity: { '2026-11-02': { xp: 60, lessons: 1, reviews: 3 } },
  streak: { current: 2, longest: 7, lastActiveDay: '2026-11-02', freezes: 2 },
  achievements: { first_lesson: '2026-11-01T10:00:00.000Z' },
  review: {
    'variables-01-q1': {
      questionId: 'variables-01-q1',
      lessonId: 'variables-01',
      box: 0,
      due: '2026-11-02',
      lapses: 2,
    },
  },
  workoutsCompleted: 3,
  mistakesFixed: 1,
  lastWorkoutDay: '2026-11-02',
  daily: { '2026-11-02': { questionId: 'variables-01-q1', correct: true } },
};

const validSession: LessonSession = {
  lessonId: 'variables-01',
  questionIds: ['variables-01-q1', 'variables-01-q2', 'variables-01-q3'],
  answers: [
    { questionId: 'variables-01-q1', correct: true },
    { questionId: 'variables-01-q2', correct: false },
  ],
  index: 2,
  savedAt: '2026-11-04T10:00:00.000Z',
};

describe('sanitizePersistedState', () => {
  it('keeps a valid state exactly as it is', () => {
    const state = { settings: validSettings, progress: validProgress, lessonSession: validSession };
    expect(sanitizePersistedState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('returns defaults for anything that is not a state', () => {
    const defaults = { settings: defaultSettings, progress: initialProgress, lessonSession: null };
    for (const raw of [undefined, null, 42, 'state', [], [{ settings: {} }]]) {
      expect(sanitizePersistedState(raw)).toEqual(defaults);
    }
  });

  it('fills in missing nested fields from the defaults', () => {
    const { settings, progress } = sanitizePersistedState({
      settings: { onboarded: true, reminder: { enabled: true } },
      progress: { totalXp: 120, streak: { current: 3 } },
    });
    expect(settings).toEqual({
      ...defaultSettings,
      onboarded: true,
      reminder: { enabled: true, hour: 19, minute: 0 },
    });
    expect(progress).toEqual({
      ...initialProgress,
      totalXp: 120,
      streak: { ...initialProgress.streak, current: 3 },
    });
  });

  it('repairs or replaces settings of the wrong type', () => {
    expect(
      sanitizeSettings({
        onboarded: 'yes',
        dailyGoalXp: '100',
        experience: 'guru',
        nickname: 42,
        playerId: { id: 1 },
        soundEnabled: null,
        reminder: { enabled: 1, hour: 31, minute: -5 },
        placementDone: true,
      }),
    ).toEqual({
      ...defaultSettings,
      dailyGoalXp: 100,
      reminder: { enabled: false, hour: 23, minute: 0 },
      placementDone: true,
    });
    expect(sanitizeSettings({ dailyGoalXp: 0 }).dailyGoalXp).toBe(1);
    expect(sanitizeSettings({ dailyGoalXp: NaN }).dailyGoalXp).toBe(50);
    expect(sanitizeSettings({ reminder: 'at 9' }).reminder).toEqual(defaultSettings.reminder);
  });

  it('repairs broken progress fields and keeps the rest of the progress', () => {
    const progress = sanitizeProgress({
      ...validProgress,
      totalXp: '230',
      lessons: {
        ...validProgress.lessons,
        'broken-01': null,
        'broken-02': 'done',
        'odd-01': { stars: 7, attempts: '3', bestCorrect: -2 },
      },
      activity: {
        ...validProgress.activity,
        '2026-11-3': { xp: '15', lessons: null },
        yesterday: { xp: 10 },
        '2026-11-04': 5,
      },
      streak: { current: 'many', longest: 7, lastActiveDay: 20261102, freezes: 9 },
      achievements: { ...validProgress.achievements, streak_7: null },
      review: {
        ...validProgress.review,
        'q-bad-due': { questionId: 'other', lessonId: 7, box: 99, due: 'soon', lapses: '1' },
        'q-null': null,
      },
      workoutsCompleted: Infinity,
      mistakesFixed: [],
      lastWorkoutDay: 'never',
      daily: {
        ...validProgress.daily,
        '2026-11-03': { questionId: 'x' },
        '2026-11-05': 'solved',
      },
    });

    expect(progress.totalXp).toBe(230);
    expect(Object.keys(progress.lessons)).toEqual(['variables-01', 'variables-02', 'odd-01']);
    expect(progress.lessons['variables-02'].skipped).toBe(true);
    expect(progress.lessons['odd-01']).toEqual({
      bestCorrect: 0,
      total: 0,
      stars: 3,
      attempts: 3,
      firstCompletedAt: new Date(0).toISOString(),
      lastCompletedAt: new Date(0).toISOString(),
    });
    expect(progress.activity).toEqual({
      '2026-11-02': { xp: 60, lessons: 1, reviews: 3 },
      '2026-11-03': { xp: 15, lessons: 0, reviews: 0 },
    });
    expect(progress.streak).toEqual({ current: 0, longest: 7, lastActiveDay: null, freezes: 2 });
    expect(progress.achievements).toEqual({
      first_lesson: '2026-11-01T10:00:00.000Z',
      streak_7: new Date(0).toISOString(),
    });
    expect(progress.review).toEqual({
      ...validProgress.review,
      'q-bad-due': {
        questionId: 'q-bad-due',
        lessonId: '',
        box: 5,
        due: '1970-01-01',
        lapses: 1,
      },
    });
    expect(progress.workoutsCompleted).toBe(0);
    expect(progress.mistakesFixed).toBe(0);
    expect(progress.lastWorkoutDay).toBeNull();
    expect(progress.daily).toEqual(validProgress.daily);
  });

  it('replaces whole sections of the wrong type', () => {
    const progress = sanitizeProgress({
      lessons: ['variables-01'],
      activity: 'none',
      review: 7,
      achievements: null,
      daily: true,
    });
    expect(progress).toEqual(initialProgress);
  });

  it('ignores keys that would change object prototypes', () => {
    const raw = JSON.parse('{"progress":{"lessons":{"__proto__":{"stars":3}}}}');
    const { progress } = sanitizePersistedState(raw);
    expect(Object.keys(progress.lessons)).toEqual([]);
    expect(({} as Record<string, unknown>).stars).toBeUndefined();
  });
});

describe('sanitizeLessonSession', () => {
  it('keeps a valid session', () => {
    expect(sanitizeLessonSession(JSON.parse(JSON.stringify(validSession)))).toEqual(validSession);
  });

  it('is null when there is no session, as in states saved before sessions existed', () => {
    expect(sanitizePersistedState({ settings: validSettings, progress: validProgress })).toEqual({
      settings: validSettings,
      progress: validProgress,
      lessonSession: null,
    });
  });

  it('drops a session with any broken part instead of repairing it', () => {
    const broken: unknown[] = [
      undefined,
      null,
      'variables-01',
      [validSession],
      { ...validSession, lessonId: '' },
      { ...validSession, lessonId: 7 },
      { ...validSession, questionIds: [] },
      { ...validSession, questionIds: 'variables-01-q1' },
      { ...validSession, questionIds: ['variables-01-q1', 2, 'variables-01-q3'] },
      { ...validSession, answers: [] },
      { ...validSession, answers: {} },
      { ...validSession, answers: [validSession.answers[0], null], index: 2 },
      { ...validSession, answers: [validSession.answers[0], { questionId: 'x', correct: 'yes' }] },
      // Answers must follow the questions in order.
      { ...validSession, answers: [...validSession.answers].reverse() },
      // More answers than questions.
      {
        ...validSession,
        questionIds: ['variables-01-q1'],
        answers: validSession.answers,
      },
      { ...validSession, index: 1 },
      { ...validSession, index: '2' },
      { ...validSession, savedAt: 'yesterday' },
      { ...validSession, savedAt: 0 },
    ];
    for (const raw of broken) expect(sanitizeLessonSession(raw)).toBeNull();
  });

  it('keeps the rest of the state when the session is broken', () => {
    const state = sanitizePersistedState({
      settings: validSettings,
      progress: validProgress,
      lessonSession: { lessonId: 'variables-01', answers: 'oops' },
    });
    expect(state).toEqual({
      settings: validSettings,
      progress: validProgress,
      lessonSession: null,
    });
  });
});

describe('day keys from storage', () => {
  it('pads unpadded keys and drops invalid ones', () => {
    expect(parseDayKey('2026-11-04')).toBe('2026-11-04');
    expect(parseDayKey('2026-1-5')).toBe('2026-01-05');
    expect(parseDayKey('2026-11-04T10:00:00.000Z')).toBe('2026-11-04');
    for (const bad of ['2026-13-01', '2026-00-10', '04.11.2026', '', null, 20261104]) {
      expect(parseDayKey(bad)).toBeNull();
    }
  });

  it('compares padded keys in calendar order', () => {
    expect(compareDays('2026-09-30', '2026-10-01')).toBeLessThan(0);
    expect(compareDays('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
    expect(compareDays('2026-11-04', '2026-11-04')).toBe(0);
  });
});

describe('migration table', () => {
  it('has a step for every version below the current one', () => {
    for (let v = 0; v < STORE_VERSION; v++) expect(typeof MIGRATIONS[v]).toBe('function');
  });

  it('leaves current and newer states to the sanitizer', () => {
    const state = { settings: validSettings, progress: validProgress };
    expect(migratePersistedState(state, STORE_VERSION)).toBe(state);
    expect(migratePersistedState(state, STORE_VERSION + 1)).toBe(state);
  });

  it('migrates a damaged v0 state without throwing', () => {
    const migrated = migratePersistedState(
      {
        userProgress: 'corrupt',
        topicsProgress: { variables: { completedLessons: ['variables-01', 5], bestStars: '3' } },
        lessonResults: [
          null,
          { lessonId: 'variables-02', completedAt: 'not a date', correctAnswers: 5 },
          {
            lessonId: 'variables-03',
            completedAt: '2026-11-01T10:00:00.000Z',
            correctAnswers: 5,
            totalQuestions: 5,
          },
        ],
        unlockedAchievements: 'all',
      },
      0,
    );
    const { progress } = sanitizePersistedState(migrated);
    expect(Object.keys(progress.lessons).sort()).toEqual(['variables-01', 'variables-03']);
    expect(progress.lessons['variables-03'].stars).toBe(3);
    expect(migratePersistedState(null, 0)).toMatchObject({ progress: { totalXp: 0 } });
  });
});
