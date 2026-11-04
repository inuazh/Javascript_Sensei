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
});
