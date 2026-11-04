/**
 * Side effects after any learning activity (and on app start):
 * reschedule reminders and publish the score if the user joined the leaderboard.
 */
import { toDayKey, weekStart } from '../domain/dates';
import { getLevelInfo } from '../domain/levels';
import { weeklyXp } from '../domain/progress';
import { viewStreak } from '../domain/streak';
import { useUserStore } from '../stores/useUserStore';
import { getAuth, isAuthEnabled } from './firebaseAuth';
import { createPlayerId, uploadScore } from './leaderboard';
import { syncReminders } from './notifications';

export async function publishScore(): Promise<void> {
  const { settings, progress, updateSettings } = useUserStore.getState();
  if (!settings.nickname) return;
  let playerId = settings.playerId;
  // After auth is turned on, players move to their uid; the old entry stays unclaimed.
  if (!playerId || (isAuthEnabled() && playerId !== (await getAuth()).uid)) {
    playerId = await createPlayerId();
    updateSettings({ playerId });
  }
  const today = toDayKey(new Date());
  return uploadScore({
    id: playerId,
    nickname: settings.nickname,
    xp: progress.totalXp,
    weekXp: weeklyXp(progress, today),
    week: weekStart(today),
    level: getLevelInfo(progress.totalXp).level,
    streak: viewStreak(progress.streak, today).days,
  });
}

export function afterActivity(): void {
  const { settings, progress } = useUserStore.getState();
  syncReminders(settings.reminder, progress).catch(() => {});
  publishScore().catch(() => {});
}
