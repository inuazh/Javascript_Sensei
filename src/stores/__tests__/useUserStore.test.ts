/* eslint-disable @typescript-eslint/no-require-imports -- modules are re-required after jest.resetModules() */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Storage = typeof import('@react-native-async-storage/async-storage').default;

/** Fresh module registry per test, so the store hydrates again from storage. */
function load(): { AsyncStorage: Storage } {
  jest.resetModules();
  const mod = require('@react-native-async-storage/async-storage');
  return { AsyncStorage: mod.default ?? mod };
}

describe('useUserStore persistence', () => {
  it('migrates the first app version state on load', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'js-sensei-user',
      JSON.stringify({
        version: 0,
        state: {
          userProgress: {
            totalXp: 5000,
            currentStreak: 2,
            longestStreak: 2,
            lastActiveDate: '2026-11-03',
            dailyGoalMinutes: 15,
          },
          topicsProgress: { variables: { completedLessons: ['variables-01'], bestStars: 3 } },
          lessonResults: [
            {
              lessonId: 'variables-01',
              completedAt: '2026-11-03T10:00:00.000Z',
              correctAnswers: 5,
              totalQuestions: 5,
            },
          ],
          isOnboarded: true,
          unlockedAchievements: [],
        },
      }),
    );
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    const { settings, progress } = useUserStore.getState();
    expect(settings).toMatchObject({
      onboarded: true,
      dailyGoalXp: 150,
      soundEnabled: true,
      nickname: null,
    });
    expect(progress.lessons['variables-01']).toMatchObject({ stars: 3 });
    expect(progress.streak.current).toBe(2);
    expect(progress.totalXp).toBe(70);
  });

  it('completes a lesson and persists the result', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    const answers = [true, true, false, true, true].map((correct, i) => ({
      questionId: `variables-01-q${i + 1}`,
      lessonId: 'variables-01',
      correct,
    }));
    const outcome = useUserStore.getState().completeLesson({ lessonId: 'variables-01', answers });
    expect(outcome).toMatchObject({ stars: 2, firstCompletion: true });
    await new Promise(r => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('js-sensei-user')) ?? '{}');
    expect(saved.version).toBe(1);
    expect(saved.state.progress.lessons['variables-01'].stars).toBe(2);
    expect(saved.state).not.toHaveProperty('completeLesson');
  });

  it('loads version 1 progress saved before «Задача дня» existed', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'js-sensei-user',
      JSON.stringify({
        version: 1,
        state: {
          settings: { onboarded: true, dailyGoalXp: 100 },
          progress: {
            lessons: {},
            totalXp: 120,
            activity: {},
            streak: { current: 3, longest: 5, lastActiveDay: '2026-11-03', freezes: 1 },
            achievements: {},
            review: {},
            workoutsCompleted: 2,
            mistakesFixed: 0,
            lastWorkoutDay: '2026-11-03',
          },
        },
      }),
    );
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    const { progress } = useUserStore.getState();
    expect(progress.daily).toEqual({});
    expect(progress.totalXp).toBe(120);
    expect(progress.streak.current).toBe(3);

    const outcome = useUserStore.getState().completeDaily({
      day: '2026-11-04',
      questionId: 'variables-01-q1',
      lessonId: 'variables-01',
      correct: true,
    });
    expect(outcome.correct).toBe(true);
    await new Promise(r => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('js-sensei-user')) ?? '{}');
    expect(saved.version).toBe(1);
    expect(saved.state.progress.daily['2026-11-04']).toEqual({
      questionId: 'variables-01-q1',
      correct: true,
    });
  });

  it('repairs fields of the wrong type on load instead of crashing later', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'js-sensei-user',
      JSON.stringify({
        version: 1,
        state: {
          settings: { onboarded: true, dailyGoalXp: 'lots', reminder: null, nickname: 7 },
          progress: {
            lessons: {
              'variables-01': {
                bestCorrect: 5,
                total: 5,
                stars: 3,
                attempts: 1,
                firstCompletedAt: '2026-11-01T10:00:00.000Z',
                lastCompletedAt: '2026-11-01T10:00:00.000Z',
              },
              'variables-02': null,
            },
            totalXp: '80',
            activity: [],
            streak: 'broken',
            review: {
              'variables-01-q1': { lessonId: 'variables-01', box: 0, due: '2026-11-1', lapses: 1 },
              junk: 3,
            },
            daily: { '2026-11-01': { questionId: 'variables-01-q2', correct: 'yes' } },
          },
        },
      }),
    );
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    const { settings, progress } = useUserStore.getState();
    expect(settings).toMatchObject({
      onboarded: true,
      dailyGoalXp: 50,
      nickname: null,
      reminder: { enabled: false, hour: 19, minute: 0 },
    });
    expect(Object.keys(progress.lessons)).toEqual(['variables-01']);
    expect(progress.totalXp).toBe(80);
    expect(progress.activity).toEqual({});
    expect(progress.streak).toEqual({ current: 0, longest: 0, lastActiveDay: null, freezes: 1 });
    expect(progress.review).toEqual({
      'variables-01-q1': {
        questionId: 'variables-01-q1',
        lessonId: 'variables-01',
        box: 0,
        due: '2026-11-01',
        lapses: 1,
      },
    });
    expect(progress.daily).toEqual({});

    // The repaired state works with the domain functions and is saved back.
    useUserStore.getState().completeWorkout({
      answers: [{ questionId: 'variables-01-q1', lessonId: 'variables-01', correct: true }],
      dueIds: ['variables-01-q1'],
    });
    await new Promise(r => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('js-sensei-user')) ?? '{}');
    expect(saved.state.progress.review['variables-01-q1'].box).toBe(1);
    expect(saved.state.progress.mistakesFixed).toBe(1);
  });

  it('starts from defaults when the saved state is not an object', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('js-sensei-user', JSON.stringify({ version: 1, state: 'oops' }));
    const { useUserStore, waitForHydration, defaultSettings } = require('../useUserStore');
    await waitForHydration();
    expect(useUserStore.getState().settings).toEqual(defaultSettings);
    expect(useUserStore.getState().progress.lessons).toEqual({});
  });

  it('does not hang when saved data is corrupt, and keeps a copy of it', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('js-sensei-user', '{not json');
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    expect(useUserStore.getState().settings.onboarded).toBe(false);
    await new Promise(r => setTimeout(r, 0));
    expect(await AsyncStorage.getItem('js-sensei-user.corrupt')).toBe('{not json');
  });

  it('saves an unfinished lesson, restores it after a reload and drops it when finished', async () => {
    let { AsyncStorage } = load();
    await AsyncStorage.clear();
    let store = require('../useUserStore');
    await store.waitForHydration();
    const lesson = {
      id: 'variables-01',
      questions: [1, 2, 3, 4, 5].map(i => ({ id: `variables-01-q${i}` })),
    };
    const answers = [true, false].map((correct, i) => ({
      questionId: `variables-01-q${i + 1}`,
      lessonId: 'variables-01',
      correct,
    }));
    store.useUserStore.getState().saveLessonSession(lesson, answers);
    await new Promise(r => setTimeout(r, 0));

    // A reload: a fresh store hydrates from what was written.
    const written = await AsyncStorage.getItem('js-sensei-user');
    ({ AsyncStorage } = load());
    await AsyncStorage.setItem('js-sensei-user', written!);
    store = require('../useUserStore');
    await store.waitForHydration();
    const { resumeLessonSession } = require('../../domain/lessonSession');
    const session = store.useUserStore.getState().lessonSession;
    expect(session).toMatchObject({ lessonId: 'variables-01', index: 2 });
    expect(resumeLessonSession(session, lesson, new Date())).toEqual(answers);

    // Leaving another lesson keeps it; leaving this one or finishing it drops it.
    store.useUserStore.getState().clearLessonSession('variables-02');
    expect(store.useUserStore.getState().lessonSession).not.toBeNull();
    store.useUserStore.getState().completeLesson({ lessonId: 'variables-01', answers });
    expect(store.useUserStore.getState().lessonSession).toBeNull();
    await new Promise(r => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('js-sensei-user')) ?? '{}');
    expect(saved.state.lessonSession).toBeNull();
    expect(saved.state.progress.lessons['variables-01']).toBeDefined();

    store.useUserStore.getState().saveLessonSession(lesson, answers);
    store.useUserStore.getState().clearLessonSession('variables-01');
    expect(store.useUserStore.getState().lessonSession).toBeNull();
  });

  it('loads progress with a damaged lesson session and drops only the session', async () => {
    const { AsyncStorage } = load();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'js-sensei-user',
      JSON.stringify({
        version: 1,
        state: {
          settings: { onboarded: true },
          progress: { totalXp: 40 },
          lessonSession: { lessonId: 'variables-01', questionIds: 5, answers: [null], index: 'x' },
        },
      }),
    );
    const { useUserStore, waitForHydration } = require('../useUserStore');
    await waitForHydration();
    const state = useUserStore.getState();
    expect(state.lessonSession).toBeNull();
    expect(state.progress.totalXp).toBe(40);
    expect(state.settings.onboarded).toBe(true);
  });
});
