/**
 * Daily streak with freezes. A freeze covers one missed day automatically.
 * Freezes are earned every 7 days of streak, up to MAX_FREEZES.
 */
import { addDays, daysBetween, type DayKey } from './dates';

export const MAX_FREEZES = 2;
export const FREEZE_EVERY_DAYS = 7;

export interface StreakState {
  current: number;
  longest: number;
  /** Last day with any activity, or null if never active. */
  lastActiveDay: DayKey | null;
  freezes: number;
}

export const initialStreak: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDay: null,
  freezes: 1,
};

export interface StreakUpdate {
  state: StreakState;
  /** The streak grew today (first activity of the day). */
  extended: boolean;
  freezesUsed: number;
  freezesEarned: number;
}

/** Applies activity on `today`. Calling it again on the same day is a no-op. */
export function recordActivity(state: StreakState, today: DayKey): StreakUpdate {
  const noChange = { state, extended: false, freezesUsed: 0, freezesEarned: 0 };
  if (state.lastActiveDay === today) return noChange;

  let current: number;
  let freezes = state.freezes;
  let freezesUsed = 0;

  if (state.lastActiveDay === null) {
    current = 1;
  } else {
    const gap = daysBetween(state.lastActiveDay, today);
    if (gap < 0) return noChange; // clock moved backwards
    const missed = gap - 1;
    if (missed === 0) {
      current = state.current + 1;
    } else if (missed <= freezes) {
      freezes -= missed;
      freezesUsed = missed;
      current = state.current + 1;
    } else {
      current = 1;
    }
  }

  let freezesEarned = 0;
  if (current > 0 && current % FREEZE_EVERY_DAYS === 0 && freezes < MAX_FREEZES) {
    freezes += 1;
    freezesEarned = 1;
  }

  return {
    state: {
      current,
      longest: Math.max(state.longest, current),
      lastActiveDay: today,
      freezes,
    },
    extended: true,
    freezesUsed,
    freezesEarned,
  };
}

export type StreakStatus =
  /** Active today. */
  | 'done'
  /** Not active today yet, streak still alive. */
  | 'pending'
  /** Streak is lost (or never started). */
  | 'none';

export interface StreakView {
  /** Streak to display right now. */
  days: number;
  status: StreakStatus;
}

/** What the UI should show today, without mutating state. */
export function viewStreak(state: StreakState, today: DayKey): StreakView {
  if (state.lastActiveDay === null || state.current === 0) return { days: 0, status: 'none' };
  if (state.lastActiveDay === today) return { days: state.current, status: 'done' };
  const missed = daysBetween(state.lastActiveDay, today) - 1;
  if (missed < 0) return { days: state.current, status: 'done' };
  if (missed <= state.freezes) return { days: state.current, status: 'pending' };
  return { days: 0, status: 'none' };
}

/** Day the streak will be lost if there is no activity (for reminders). */
export function streakDeadline(state: StreakState): DayKey | null {
  if (!state.lastActiveDay || state.current === 0) return null;
  return addDays(state.lastActiveDay, 1 + state.freezes);
}
