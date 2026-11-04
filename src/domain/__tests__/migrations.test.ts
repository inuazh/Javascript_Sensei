import { toDayKey } from '../dates';
import { migrateLegacyState, migratePersistedState } from '../migrations';
import { sanitizePersistedState } from '../persistence';
import { lessonResultXp } from '../rewards';

describe('migrateLegacyState', () => {
  it('converts lesson history, recalculating XP without replay farming', () => {
    const { progress, settings } = migrateLegacyState({
      userProgress: {
        totalXp: 9999,
        currentStreak: 3,
        longestStreak: 5,
        lastActiveDate: '2026-11-03',
        dailyGoalMinutes: 10,
        freezesAvailable: 1,
        selectedLevel: 'intermediate',
      },
      topicsProgress: {
        variables: { completedLessons: ['variables-01', 'variables-02'], bestStars: 2 },
      },
      lessonResults: [
        {
          lessonId: 'variables-01',
          completedAt: '2026-11-01T10:00:00.000Z',
          correctAnswers: 3,
          totalQuestions: 5,
        },
        {
          lessonId: 'variables-01',
          completedAt: '2026-11-02T10:00:00.000Z',
          correctAnswers: 5,
          totalQuestions: 5,
        },
        {
          lessonId: 'variables-01',
          completedAt: '2026-11-02T11:00:00.000Z',
          correctAnswers: 5,
          totalQuestions: 5,
        },
      ],
      isOnboarded: true,
      unlockedAchievements: [
        { id: 'first_lesson', unlockedAt: '2026-11-01T10:00:00.000Z' },
        { id: 'removed_achievement', unlockedAt: '2026-11-01T10:00:00.000Z' },
      ],
    });

    expect(progress.lessons['variables-01']).toMatchObject({
      bestCorrect: 5,
      stars: 3,
      attempts: 3,
    });
    expect(progress.lessons['variables-02']).toMatchObject({ stars: 2 });
    expect(Object.keys(progress.achievements)).toEqual(['first_lesson']);
    expect(progress.totalXp).toBe(lessonResultXp(5, 5) + 20);
    expect(progress.streak).toEqual({
      current: 3,
      longest: 5,
      lastActiveDay: '2026-11-03',
      freezes: 1,
    });
    expect(settings).toEqual({ onboarded: true, dailyGoalXp: 100, experience: 'intermediate' });
  });

  it('turns the UTC lastActiveDate of v0 into the local day of the last lesson', () => {
    // v0 stored toISOString().split('T')[0]. Whatever the time zone, the last
    // lesson's local day is the day the streak was last extended.
    const completedAt = '2026-11-03T22:30:00.000Z';
    const localDay = toDayKey(new Date(completedAt));
    const { progress } = migrateLegacyState({
      userProgress: { currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-11-03' },
      lessonResults: [
        { lessonId: 'variables-01', completedAt, correctAnswers: 5, totalQuestions: 5 },
      ],
    });
    expect(progress.streak.lastActiveDay).toBe(localDay);
    expect(Object.keys(progress.activity)).toEqual([localDay]);
  });

  it('keeps the XP of valid records when some legacy numbers or ids are corrupt', () => {
    const state = migratePersistedState(
      {
        lessonResults: [
          {
            lessonId: 'variables-01',
            completedAt: '2026-11-01T10:00:00.000Z',
            correctAnswers: 5,
            totalQuestions: 5,
          },
          {
            lessonId: 'variables-02',
            completedAt: '2026-11-01T11:00:00.000Z',
            correctAnswers: 'five',
            totalQuestions: 5,
          },
        ],
        unlockedAchievements: [
          { id: 'first_lesson', unlockedAt: '2026-11-01T10:00:00.000Z' },
          { id: 'toString', unlockedAt: '2026-11-01T10:00:00.000Z' },
        ],
      },
      0,
    );
    const { progress } = sanitizePersistedState(state);
    expect(progress.totalXp).toBe(lessonResultXp(5, 5) + lessonResultXp(0, 5) + 20);
    expect(Object.keys(progress.achievements)).toEqual(['first_lesson']);
  });

  it('handles an empty legacy state', () => {
    const { progress, settings } = migrateLegacyState({});
    expect(progress.totalXp).toBe(0);
    expect(settings).toEqual({ onboarded: false, dailyGoalXp: 50, experience: 'beginner' });
  });
});
