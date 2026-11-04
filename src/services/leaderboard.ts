/**
 * Global leaderboard on Firebase Realtime Database (REST API).
 * Participation is opt-in: nothing is sent until the user picks a nickname.
 *
 * Data (see database.rules.json and docs/firebase.md):
 *   /leaderboard/{playerId}      = { nickname, xp, streak, updatedAt }
 *   /weekly/{week}/{playerId}    = { nickname, xp, streak, weekXp, week, updatedAt }
 * `week` is weekNumber() of the Monday, so every week has its own list and
 * old weeks never crowd out the current one. The level is derived from XP.
 * With Firebase auth configured, playerId is the anonymous user's uid and
 * database rules only let a user write or delete their own entries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelInfo } from '../domain/levels';
import { validateNickname } from '../domain/nickname';
import { getAuth, isAuthEnabled } from './firebaseAuth';

export const FIREBASE_DB_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DB_URL ??
  'https://javascript-sensei-default-rtdb.europe-west1.firebasedatabase.app';

/** Must not exceed the `query.limitToLast` allowed by the database rules. */
const FETCH_LIMIT = 200;
const LEGACY_DEVICE_ID_KEY = 'js_sensei_device_id';

export interface PlayerEntry {
  id: string;
  nickname: string;
  xp: number;
  /** XP this week; 0 in the all-time list. */
  weekXp: number;
  level: number;
  streak: number;
}

export interface Score {
  id: string;
  nickname: string;
  xp: number;
  weekXp: number;
  /** weekNumber() of the week `weekXp` belongs to. */
  week: number;
  streak: number;
}

/**
 * The player's id: the anonymous Firebase uid when auth is configured,
 * otherwise the id of the first app version (so existing players keep their entry).
 */
export async function createPlayerId(): Promise<string> {
  if (isAuthEnabled()) return (await getAuth()).uid;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_DEVICE_ID_KEY);
    if (legacy) return legacy;
  } catch {
    // fall through to a new id
  }
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${random()}${random()}${Date.now().toString(36)}`;
}

/** `?auth=…` for the signed-in user who owns `id`, or '' without auth. */
async function authQuery(id: string): Promise<string> {
  if (!isAuthEnabled()) return '';
  const auth = await getAuth();
  if (auth.uid !== id) throw new Error('Player id does not match the signed-in user');
  return `?auth=${encodeURIComponent(auth.idToken)}`;
}

const entryPath = (id: string) => `leaderboard/${id}`;
const weeklyPath = (week: number, id: string) => `weekly/${week}/${id}`;
const url = (path: string) =>
  `${FIREBASE_DB_URL}/${path.split('/').map(encodeURIComponent).join('/')}.json`;

/**
 * Writes the all-time entry and this week's entry in one atomic multi-path
 * update: the rules check the weekly copy against the new all-time entry.
 */
export async function uploadScore(score: Score): Promise<void> {
  const { id, nickname, xp, weekXp, week, streak } = score;
  const query = await authQuery(id);
  // Server time lets the database rules limit how fast XP can grow.
  const updatedAt = { '.sv': 'timestamp' };
  const entry = { nickname, xp, streak, updatedAt };
  const body = {
    [entryPath(id)]: entry,
    // No XP this week (or progress was reset): no weekly entry.
    [weeklyPath(week, id)]: weekXp > 0 ? { ...entry, weekXp, week } : null,
  };
  const res = await fetch(`${FIREBASE_DB_URL}/.json${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Leaderboard upload failed: ${res.status}`);
}

/**
 * Deletes the player's all-time entry and the weekly entries of `week` and
 * the week before (older weeks are not shown anywhere). Best effort:
 * resolves to false if any request failed.
 */
export async function deleteScore(id: string, week: number): Promise<boolean> {
  try {
    const query = await authQuery(id);
    const paths = [entryPath(id), weeklyPath(week, id), weeklyPath(week - 7, id)];
    const results = await Promise.allSettled(
      paths.map(path => fetch(`${url(path)}${query}`, { method: 'DELETE' })),
    );
    return results.every(r => r.status === 'fulfilled' && r.value.ok);
  } catch {
    return false;
  }
}

/** Upper bounds of the database rules: anything beyond is not a real entry. */
const MAX_XP = 1_000_000;
const MAX_STREAK = 100_000;
const MAX_ID_LENGTH = 128;

/** A whole number in 0..max, or null. */
function count(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}

/**
 * The database is public: an entry may have been written by anything that
 * passed (or predates) the rules. Only well-formed entries are shown, so a
 * huge string or a wrong type cannot break the leaderboard screen.
 */
function toEntry(id: string, raw: unknown): PlayerEntry | null {
  if (id.length === 0 || id.length > MAX_ID_LENGTH) return null;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  // Entries from the first app version have no nickname; names the app itself
  // would not accept (reserved, too long, control characters) are hidden too.
  if (typeof r.nickname !== 'string' || validateNickname(r.nickname) !== null) return null;
  if (r.nickname !== r.nickname.trim()) return null;
  const xp = count(r.xp, MAX_XP);
  if (xp === null) return null;
  return {
    id,
    nickname: r.nickname,
    xp,
    weekXp: Math.min(count(r.weekXp, MAX_XP) ?? 0, xp),
    level: getLevelInfo(xp).level,
    streak: count(r.streak, MAX_STREAK) ?? 0,
  };
}

/** The read rules only allow exactly these queries: ordered by one field, at most FETCH_LIMIT. */
async function fetchList(path: string, orderBy: 'xp' | 'weekXp'): Promise<PlayerEntry[]> {
  const res = await fetch(
    `${url(path)}?orderBy=${encodeURIComponent(`"${orderBy}"`)}&limitToLast=${FETCH_LIMIT}`,
  );
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const data: unknown = await res.json();
  if (typeof data !== 'object' || data === null) return [];
  return Object.entries(data)
    .slice(0, FETCH_LIMIT)
    .map(([id, raw]) => toEntry(id, raw))
    .filter((e): e is PlayerEntry => e !== null);
}

/** Top players of all time. */
export function fetchAllTime(): Promise<PlayerEntry[]> {
  return fetchList('leaderboard', 'xp');
}

/** Top players of `week` (a weekNumber()). */
export function fetchWeek(week: number): Promise<PlayerEntry[]> {
  return fetchList(`weekly/${week}`, 'weekXp');
}

export function rankWeekly(players: PlayerEntry[]): PlayerEntry[] {
  return players.filter(p => p.weekXp > 0).sort((a, b) => b.weekXp - a.weekXp);
}

export function rankAllTime(players: PlayerEntry[]): PlayerEntry[] {
  return [...players].sort((a, b) => b.xp - a.xp);
}
