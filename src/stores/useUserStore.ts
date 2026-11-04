/**
 * Persisted user state: settings and learning progress.
 * Business rules live in src/domain; this store only persists state and
 * wires domain functions to the app. Persisted data is migrated with the
 * version table in src/domain/migrations.ts and validated with
 * src/domain/persistence.ts on every load.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getContentIndex } from '../content/repository';
import { migratePersistedState, STORE_VERSION } from '../domain/migrations';
import { sanitizePersistedState, type PersistedState } from '../domain/persistence';
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
import { defaultSettings, type Settings } from '../domain/settings';

export { defaultSettings };
export type { ExperienceLevel, ReminderSettings, Settings } from '../domain/settings';

export const DAILY_GOALS = [
  { xp: 50, title: 'лёгкий', subtitle: '≈ 1 урок в день' },
  { xp: 100, title: 'нормальный', subtitle: '≈ 2 урока в день' },
  { xp: 150, title: 'серьёзный', subtitle: '≈ 3 урока в день' },
] as const;

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

const STORAGE_KEY = 'js-sensei-user';

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
      // Runs only when the saved version differs; `merge` validates the result.
      migrate: (persisted, version) => migratePersistedState(persisted, version) as PersistedState,
      onRehydrateStorage: () => (_state, error) => {
        if (error) handleHydrationError(error);
      },
      // Every load: missing fields at any depth get their defaults and fields of
      // the wrong type are repaired or dropped, so adding a field with a default
      // needs no version bump and a damaged field cannot crash a screen.
      merge: (persisted, current) => ({ ...current, ...sanitizePersistedState(persisted) }),
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
