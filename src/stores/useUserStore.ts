/**
 * Persisted user state: settings and learning progress.
 * Business rules live in src/domain; this store only persists state and
 * wires domain functions to the app. Bump STORE_VERSION and extend
 * `migrate` whenever the persisted shape changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getContentIndex } from '../content/repository';
import {
  migrateLegacyState,
  type ExperienceLevel,
  type LegacyUserState,
} from '../domain/migrations';
import {
  completeLesson,
  completeWorkout,
  initialProgress,
  type LessonOutcome,
  type LessonResultInput,
  type ProgressState,
  type WorkoutOutcome,
  type WorkoutResultInput,
} from '../domain/progress';

export type { ExperienceLevel };

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface Settings {
  onboarded: boolean;
  dailyGoalXp: number;
  experience: ExperienceLevel;
  /** Leaderboard identity; both are null until the user joins the leaderboard. */
  nickname: string | null;
  playerId: string | null;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reminder: ReminderSettings;
}

export const DAILY_GOALS = [
  { xp: 50, title: 'Лёгкий', subtitle: '≈ 1 урок в день' },
  { xp: 100, title: 'Нормальный', subtitle: '≈ 2 урока в день' },
  { xp: 150, title: 'Серьёзный', subtitle: '≈ 3 урока в день' },
] as const;

export const defaultSettings: Settings = {
  onboarded: false,
  dailyGoalXp: 50,
  experience: 'beginner',
  nickname: null,
  playerId: null,
  soundEnabled: true,
  hapticsEnabled: true,
  reminder: { enabled: false, hour: 19, minute: 0 },
};

interface UserState {
  settings: Settings;
  progress: ProgressState;

  updateSettings: (patch: Partial<Settings>) => void;
  completeLesson: (input: LessonResultInput) => LessonOutcome;
  completeWorkout: (input: WorkoutResultInput) => WorkoutOutcome;
  resetProgress: () => void;
}

const STORE_VERSION = 1;

type PersistedState = Pick<UserState, 'settings' | 'progress'>;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      progress: initialProgress,

      updateSettings: patch => set(state => ({ settings: { ...state.settings, ...patch } })),

      completeLesson: input => {
        const { settings, progress } = get();
        const { state, outcome } = completeLesson(progress, input, {
          now: new Date(),
          content: getContentIndex(),
          dailyGoalXp: settings.dailyGoalXp,
        });
        set({ progress: state });
        return outcome;
      },

      completeWorkout: input => {
        const { settings, progress } = get();
        const { state, outcome } = completeWorkout(progress, input, {
          now: new Date(),
          content: getContentIndex(),
          dailyGoalXp: settings.dailyGoalXp,
        });
        set({ progress: state });
        return outcome;
      },

      resetProgress: () => set({ progress: initialProgress }),
    }),
    {
      name: 'js-sensei-user',
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        settings: state.settings,
        progress: state.progress,
      }),
      migrate: (persisted, version): PersistedState => {
        if (version === 0) {
          const { progress, settings } = migrateLegacyState(persisted as LegacyUserState);
          return { progress, settings: { ...defaultSettings, ...settings } };
        }
        return persisted as PersistedState;
      },
      // New settings keys added later get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          settings: { ...defaultSettings, ...p.settings },
          progress: { ...initialProgress, ...p.progress },
        };
      },
    },
  ),
);

/** Resolves once the persisted state has been loaded. */
export function waitForHydration(): Promise<void> {
  if (useUserStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise(resolve => {
    const unsub = useUserStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
