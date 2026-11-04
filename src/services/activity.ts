/**
 * Side effects after any learning activity (and on app start):
 * reschedule reminders and publish the score if the user joined the leaderboard.
 */
import { toDayKey, weekStart } from '../domain/dates';
import { getLevelInfo } from '../domain/levels';
import { weeklyXp } from '../domain/progress';
import { viewStreak } from '../domain/streak';
import { useUserStore } from '../stores/useUserStore';
import { uploadScore } from './leaderboard';
import { syncReminders } from './notifications';

export function publishScore(): Promise<void> {
  const { settings, progress } = useUserStore.getState();
  if (!settings.playerId || !settings.nickname) return Promise.resolve();
  const today = toDayKey(new Date());
  return uploadScore({
    id: settings.playerId,
    nickname: settings.nickname,
    xp: progress.totalXp,
    weekXp: weeklyXp(progress, today),
    week: weekStart(today),
    level: getLevelInfo(progress.totalXp).level,
    streak: viewStreak(progress.streak, today).days,
    updatedAt: new Date().toISOString(),
  });
}

export function afterActivity(): void {
  const { settings, progress } = useUserStore.getState();
  syncReminders(settings.reminder, progress).catch(() => {});
  publishScore().catch(() => {});
}
