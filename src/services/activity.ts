/**
 * Side effects after any learning activity (and on app start):
 * reschedule reminders and publish the score if the user joined the leaderboard.
 */
import { toDayKey, weekNumber } from '../domain/dates';
import { validateNickname } from '../domain/nickname';
import { weeklyXp } from '../domain/progress';
import { viewStreak } from '../domain/streak';
import { useUserStore } from '../stores/useUserStore';
import { getAuth, isAuthEnabled } from './firebaseAuth';
import { createPlayerId, deleteScore, uploadScore } from './leaderboard';
import { syncReminders } from './notifications';

export async function publishScore(): Promise<void> {
  const { settings, progress, updateSettings } = useUserStore.getState();
  // A nickname saved by an older version may not pass the current rules;
  // the leaderboard screen asks for a new one.
  if (!settings.nickname || validateNickname(settings.nickname)) return;
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
    week: weekNumber(today),
    streak: viewStreak(progress.streak, today).days,
  });
}

/**
 * Leaves the leaderboard: forgets the nickname and asks the server to delete
 * the player's entries. The deletion is best effort (offline, no auth).
 */
export async function leaveLeaderboard(): Promise<boolean> {
  const { settings, updateSettings } = useUserStore.getState();
  updateSettings({ nickname: null });
  if (!settings.playerId) return true;
  return deleteScore(settings.playerId, weekNumber(toDayKey(new Date())));
}

export function afterActivity(): void {
  const { settings, progress } = useUserStore.getState();
  syncReminders(settings.reminder, progress).catch(() => {});
  publishScore().catch(() => {});
}
