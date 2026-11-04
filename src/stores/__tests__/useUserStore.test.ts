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
});
