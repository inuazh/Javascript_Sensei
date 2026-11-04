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
  completeDaily,
  completeLesson,
  completeWorkout,
  initialProgress,
  skipLessons,
  type DailyOutcome,
  type DailyResultInput,
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
  /** The placement test was taken or declined. */
  placementDone: boolean;
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
  placementDone: false,
};

interface UserState {
  settings: Settings;
  progress: ProgressState;

  updateSettings: (patch: Partial<Settings>) => void;
  completeLesson: (input: LessonResultInput) => LessonOutcome;
  completeWorkout: (input: WorkoutResultInput) => WorkoutOutcome;
  completeDaily: (input: DailyResultInput) => DailyOutcome;
  /** Marks lessons as known after the placement test (no XP). */
  applyPlacement: (lessonIds: string[]) => void;
  resetProgress: () => void;
}

const STORE_VERSION = 1;
const STORAGE_KEY = 'js-sensei-user';

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

      completeDaily: input => {
        const { settings, progress } = get();
        const { state, outcome } = completeDaily(progress, input, {
          now: new Date(),
          content: getContentIndex(),
          dailyGoalXp: settings.dailyGoalXp,
        });
        set({ progress: state });
        return outcome;
      },

      applyPlacement: lessonIds =>
        set(state => ({
          progress: skipLessons(state.progress, lessonIds, new Date()),
          settings: { ...state.settings, placementDone: true },
        })),

      resetProgress: () =>
        set(state => ({
          progress: initialProgress,
          settings: { ...state.settings, placementDone: false },
        })),
    }),
    {
      name: STORAGE_KEY,
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
      onRehydrateStorage: () => (_state, error) => {
        if (error) handleHydrationError(error);
      },
      // Keys added later (settings, or progress fields such as `daily`) get their
      // defaults, so adding a field with a default needs no version bump.
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

const HYDRATION_TIMEOUT_MS = 8000;
let hydrationFailed = false;
const failureListeners = new Set<() => void>();

/**
 * Stored state could not be read or migrated. The app starts with defaults so
 * it never hangs on the splash screen; the raw value is copied aside first so
 * the next write does not destroy it.
 */
function handleHydrationError(error: unknown) {
  console.warn('Failed to restore saved progress', error);
  hydrationFailed = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then(raw => (raw ? AsyncStorage.setItem(`${STORAGE_KEY}.corrupt`, raw) : undefined))
    .catch(() => {});
  failureListeners.forEach(listener => listener());
}

/** Resolves once the persisted state has been loaded, failed to load, or timed out. */
export function waitForHydration(): Promise<void> {
  if (useUserStore.persist.hasHydrated() || hydrationFailed) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => {
      unsub();
      failureListeners.delete(done);
      clearTimeout(timer);
      resolve();
    };
    const unsub = useUserStore.persist.onFinishHydration(done);
    failureListeners.add(done);
    const timer = setTimeout(done, HYDRATION_TIMEOUT_MS);
  });
}
