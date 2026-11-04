/** User settings: their shape and defaults. Persisted with the progress. */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

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
