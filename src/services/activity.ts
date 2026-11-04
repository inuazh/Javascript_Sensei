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

/** The last upload or deletion; the next one starts after it has settled. */
let queue: Promise<unknown> = Promise.resolve();
/** React Native's fetch has no timeout: a hung request must not block the queue for good. */
const MAX_WAIT_MS = 20_000;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<void>(resolve => {
    timer = setTimeout(resolve, MAX_WAIT_MS);
  });
  const run = Promise.race([queue, limit])
    .finally(() => clearTimeout(timer))
    .then(task);
  queue = run.catch(() => {});
  return run;
}

/**
 * Uploads the current score. Uploads run one at a time, so an older score
 * cannot land after a newer one, and they always use the latest state.
 */
export function publishScore(): Promise<void> {
  return enqueue(uploadCurrentScore);
}

async function uploadCurrentScore(): Promise<void> {
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
  useUserStore.getState().updateSettings({ nickname: null });
  // Waits for an upload in flight: a DELETE that overtook it would let the
  // upload write the entry back after the user left.
  return enqueue(async () => {
    const { playerId } = useUserStore.getState().settings;
    if (!playerId) return true;
    return deleteScore(playerId, weekNumber(toDayKey(new Date())));
  });
}

export function afterActivity(): void {
  const { settings, progress } = useUserStore.getState();
  syncReminders(settings.reminder, progress).catch(() => {});
  publishScore().catch(() => {});
}
