import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelForXp, getStarsForLesson, calculateLessonXp, ACHIEVEMENTS, XP_DAILY_CHALLENGE } from '../constants/gamification';

interface UserProgress {
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  dailyGoalMinutes: number;
  freezesAvailable: number;
  selectedLevel: string;
}

interface TopicProgress {
  topicId: string;
  status: 'locked' | 'current' | 'done';
  bestStars: number;
  completedLessons: string[];
  earnedXp: number;
}

interface LessonResult {
  lessonId: string;
  completedAt: string;
  stars: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSec: number;
  xpEarned: number;
}

interface WeekActivity {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

interface DailyChallenge {
  date: string;
  topicId: string;
  lessonId: string;
  completed: boolean;
}

interface UserStoreState {
  // State
  userProgress: UserProgress;
  topicsProgress: Record<string, TopicProgress>;
  lessonResults: LessonResult[];
  weekActivity: WeekActivity;
  isOnboarded: boolean;
  unlockedAchievements: UnlockedAchievement[];
  dailyChallenge: DailyChallenge | null;

  // Computed getters
  currentLevel: () => number;
  currentTitle: () => string;
  xpToNextLevel: () => number;
  nextLevelXp: () => number;
  totalStars: () => number;
  totalLessons: () => number;

  // Actions
  setOnboarded: (dailyGoalMinutes: number, selectedLevel?: string) => void;
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, topicId: string, correct: number, total: number, timeSec: number) => string[];
  updateStreak: () => void;
  useFreeze: () => void;
  setDailyGoal: (minutes: number) => void;
  unlockTopic: (topicId: string) => void;
  setDailyChallenge: (challenge: DailyChallenge) => void;
  completeDailyChallenge: () => void;
  resetProgress: () => void;
}

const defaultProgress: UserProgress = {
  level: 1,
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  dailyGoalMinutes: 5,
  freezesAvailable: 1,
  selectedLevel: 'beginner',
};

const defaultWeekActivity: WeekActivity = {
  mon: false, tue: false, wed: false, thu: false,
  fri: false, sat: false, sun: false,
};

function getDayKey(date: Date): keyof WeekActivity {
  const days: (keyof WeekActivity)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

function getISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function checkAchievements(
  existing: UnlockedAchievement[],
  params: {
    totalLessons: number;
    newStreak: number;
    stars: number;
    totalStars: number;
    newTitle: string;
    todayLessons: number;
    hour: number;
  }
): string[] {
  const existingIds = new Set(existing.map(a => a.id));
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (!existingIds.has(id) && condition) newlyUnlocked.push(id);
  };

  check('first_lesson', params.totalLessons >= 1);
  check('perfect_lesson', params.stars === 3);
  check('streak_7', params.newStreak >= 7);
  check('streak_30', params.newStreak >= 30);
  check('all_stars', params.totalStars >= 100);
  check('junior_dev', params.newTitle === 'Junior Dev');
  check('middle_dev', params.newTitle === 'Middle Dev');
  check('senior_dev', params.newTitle === 'Senior Dev');
  check('js_sensei', params.newTitle === 'JS Sensei');
  check('speed_demon', params.todayLessons >= 5);
  check('night_owl', params.hour >= 22);

  return newlyUnlocked;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      userProgress: defaultProgress,
      topicsProgress: {
        variables: { topicId: 'variables', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        'data-types': { topicId: 'data-types', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        operators: { topicId: 'operators', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        conditions: { topicId: 'conditions', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        loops: { topicId: 'loops', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        functions: { topicId: 'functions', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        arrays: { topicId: 'arrays', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        objects: { topicId: 'objects', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        'set-map': { topicId: 'set-map', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
      },
      lessonResults: [],
      weekActivity: defaultWeekActivity,
      isOnboarded: false,
      unlockedAchievements: [],
      dailyChallenge: null,

      // ── Computed ──
      currentLevel: () => {
        const { totalXp } = get().userProgress;
        return getLevelForXp(totalXp).level;
      },
      currentTitle: () => {
        const { totalXp } = get().userProgress;
        return getLevelForXp(totalXp).title;
      },
      xpToNextLevel: () => {
        const { totalXp } = get().userProgress;
        const current = getLevelForXp(totalXp);
        return current.maxXp === Infinity ? 0 : current.maxXp - totalXp;
      },
      nextLevelXp: () => {
        const { totalXp } = get().userProgress;
        const current = getLevelForXp(totalXp);
        return current.maxXp === Infinity ? totalXp : current.maxXp;
      },
      totalStars: () => {
        return Object.values(get().topicsProgress).reduce((sum, t) => sum + t.bestStars, 0);
      },
      totalLessons: () => {
        return Object.values(get().topicsProgress).reduce(
          (sum, t) => sum + t.completedLessons.length, 0
        );
      },

      // ── Actions ──
      setOnboarded: (dailyGoalMinutes, selectedLevel = 'beginner') => {
        set(state => ({
          isOnboarded: true,
          userProgress: { ...state.userProgress, dailyGoalMinutes, selectedLevel },
        }));
      },

      addXp: (amount) => {
        set(state => ({
          userProgress: {
            ...state.userProgress,
            totalXp: state.userProgress.totalXp + amount,
          },
        }));
      },

      completeLesson: (lessonId, topicId, correct, total, timeSec) => {
        const xpEarned = calculateLessonXp(correct, total);
        const stars = getStarsForLesson(correct, total);
        const now = new Date();
        const todayKey = getISODate(now);
        const dayKey = getDayKey(now);
        const hour = now.getHours();

        const state = get();

        const topicProg = state.topicsProgress[topicId] || {
          topicId,
          status: 'current' as const,
          bestStars: 0,
          completedLessons: [],
          earnedXp: 0,
        };

        const alreadyDone = topicProg.completedLessons.includes(lessonId);
        const newCompletedLessons = alreadyDone
          ? topicProg.completedLessons
          : [...topicProg.completedLessons, lessonId];

        const newResult: LessonResult = {
          lessonId,
          completedAt: now.toISOString(),
          stars,
          correctAnswers: correct,
          totalQuestions: total,
          timeSpentSec: timeSec,
          xpEarned,
        };

        // Update streak
        const { lastActiveDate, currentStreak, longestStreak } = state.userProgress;
        const yesterday = getISODate(new Date(now.getTime() - 86400000));
        let newStreak = currentStreak;
        if (lastActiveDate !== todayKey) {
          newStreak = lastActiveDate === yesterday ? currentStreak + 1 : 1;
        }

        const newTotalXp = state.userProgress.totalXp + xpEarned;
        const newTitle = getLevelForXp(newTotalXp).title;

        // Count today's completed lessons (for speed_demon achievement)
        const todayLessons = state.lessonResults.filter(
          r => r.completedAt.startsWith(todayKey)
        ).length + 1;

        // New total stars including this lesson's stars
        const newTotalStars = Object.values(state.topicsProgress).reduce((sum, t) => {
          if (t.topicId === topicId) return sum + Math.max(t.bestStars, stars);
          return sum + t.bestStars;
        }, 0);

        // New total lessons count
        const newTotalLessons = Object.values(state.topicsProgress).reduce(
          (sum, t) => sum + t.completedLessons.length, 0
        ) + (alreadyDone ? 0 : 1);

        // Check achievements
        const newlyUnlocked = checkAchievements(state.unlockedAchievements, {
          totalLessons: newTotalLessons,
          newStreak,
          stars,
          totalStars: newTotalStars,
          newTitle,
          todayLessons,
          hour,
        });

        const newUnlockedAchievements: UnlockedAchievement[] = [
          ...state.unlockedAchievements,
          ...newlyUnlocked.map(id => ({ id, unlockedAt: now.toISOString() })),
        ];

        set({
          userProgress: {
            ...state.userProgress,
            totalXp: newTotalXp,
            currentStreak: newStreak,
            longestStreak: Math.max(longestStreak, newStreak),
            lastActiveDate: todayKey,
          },
          topicsProgress: {
            ...state.topicsProgress,
            [topicId]: {
              ...topicProg,
              bestStars: Math.max(topicProg.bestStars, stars),
              completedLessons: newCompletedLessons,
              earnedXp: topicProg.earnedXp + (alreadyDone ? 0 : xpEarned),
            },
          },
          lessonResults: [...state.lessonResults, newResult],
          weekActivity: { ...state.weekActivity, [dayKey]: true },
          unlockedAchievements: newUnlockedAchievements,
        });

        return newlyUnlocked;
      },

      updateStreak: () => {
        set(state => {
          const today = getISODate(new Date());
          const yesterday = getISODate(new Date(Date.now() - 86400000));
          const { lastActiveDate, currentStreak, freezesAvailable } = state.userProgress;
          if (lastActiveDate === today) return state;
          if (lastActiveDate === yesterday) return state;
          // Missed a day — check freeze
          if (freezesAvailable > 0) {
            return {
              userProgress: {
                ...state.userProgress,
                freezesAvailable: freezesAvailable - 1,
              },
            };
          }
          return {
            userProgress: { ...state.userProgress, currentStreak: 0 },
          };
        });
      },

      useFreeze: () => {
        set(state => {
          if (state.userProgress.freezesAvailable <= 0) return state;
          return {
            userProgress: {
              ...state.userProgress,
              freezesAvailable: state.userProgress.freezesAvailable - 1,
            },
          };
        });
      },

      setDailyGoal: (minutes) => {
        set(state => ({
          userProgress: { ...state.userProgress, dailyGoalMinutes: minutes },
        }));
      },

      unlockTopic: (topicId) => {
        set(state => ({
          topicsProgress: {
            ...state.topicsProgress,
            [topicId]: {
              ...(state.topicsProgress[topicId] || { topicId, bestStars: 0, completedLessons: [], earnedXp: 0 }),
              status: 'current',
            },
          },
        }));
      },

      setDailyChallenge: (challenge) => {
        set({ dailyChallenge: challenge });
      },

      completeDailyChallenge: () => {
        set(state => {
          if (!state.dailyChallenge || state.dailyChallenge.completed) return state;
          return {
            dailyChallenge: { ...state.dailyChallenge, completed: true },
            userProgress: {
              ...state.userProgress,
              totalXp: state.userProgress.totalXp + XP_DAILY_CHALLENGE,
            },
          };
        });
      },

      resetProgress: () => {
        set({
          userProgress: defaultProgress,
          lessonResults: [],
          weekActivity: defaultWeekActivity,
          unlockedAchievements: [],
          dailyChallenge: null,
        });
      },
    }),
    {
      name: 'js-sensei-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
