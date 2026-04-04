import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelForXp, getStarsForLesson, calculateLessonXp, ACHIEVEMENTS } from '../constants/gamification';

interface UserProgress {
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  dailyGoalMinutes: number;
  freezesAvailable: number;
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

interface UserStoreState {
  // State
  userProgress: UserProgress;
  topicsProgress: Record<string, TopicProgress>;
  lessonResults: LessonResult[];
  weekActivity: WeekActivity;
  isOnboarded: boolean;
  unlockedAchievements: UnlockedAchievement[];

  // Computed getters
  currentLevel: () => number;
  currentTitle: () => string;
  xpToNextLevel: () => number;
  nextLevelXp: () => number;
  totalStars: () => number;
  totalLessons: () => number;

  // Actions
  setOnboarded: (dailyGoalMinutes: number) => void;
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, topicId: string, correct: number, total: number, timeSec: number) => void;
  updateStreak: () => void;
  useFreeze: () => void;
  setDailyGoal: (minutes: number) => void;
  unlockTopic: (topicId: string) => void;
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

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      userProgress: defaultProgress,
      topicsProgress: {
        variables: { topicId: 'variables', status: 'current', bestStars: 0, completedLessons: [], earnedXp: 0 },
        'data-types': { topicId: 'data-types', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        operators: { topicId: 'operators', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        conditions: { topicId: 'conditions', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        loops: { topicId: 'loops', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        functions: { topicId: 'functions', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        arrays: { topicId: 'arrays', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        objects: { topicId: 'objects', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
        'set-map': { topicId: 'set-map', status: 'locked', bestStars: 0, completedLessons: [], earnedXp: 0 },
      },
      lessonResults: [],
      weekActivity: defaultWeekActivity,
      isOnboarded: false,
      unlockedAchievements: [],

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
      setOnboarded: (dailyGoalMinutes) => {
        set(state => ({
          isOnboarded: true,
          userProgress: { ...state.userProgress, dailyGoalMinutes },
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

        set(state => {
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

          return {
            userProgress: {
              ...state.userProgress,
              totalXp: state.userProgress.totalXp + xpEarned,
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
          };
        });
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

      resetProgress: () => {
        set({
          userProgress: defaultProgress,
          lessonResults: [],
          weekActivity: defaultWeekActivity,
          unlockedAchievements: [],
        });
      },
    }),
    {
      name: 'js-sensei-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
