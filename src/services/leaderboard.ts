/**
 * Global leaderboard on Firebase Realtime Database (REST API).
 * Participation is opt-in: nothing is sent until the user picks a nickname.
 *
 * Data: /leaderboard/{playerId} = { nickname, xp, weekXp, week, level, streak, updatedAt }.
 * Weekly ranking uses the entries whose `week` is the current week.
 * With Firebase auth configured, playerId is the anonymous user's uid and
 * database rules only let a user write their own entry (docs/firebase.md).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, isAuthEnabled } from './firebaseAuth';

export const FIREBASE_DB_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DB_URL ??
  'https://javascript-sensei-default-rtdb.europe-west1.firebasedatabase.app';

const FETCH_LIMIT = 200;
const LEGACY_DEVICE_ID_KEY = 'js_sensei_device_id';

export interface PlayerEntry {
  id: string;
  nickname: string;
  xp: number;
  weekXp: number;
  /** Monday (YYYY-MM-DD) of the week `weekXp` belongs to. */
  week: string;
  level: number;
  streak: number;
}

export const NICKNAME_RE = /^[\p{L}\p{N}_ .-]{3,20}$/u;

export function validateNickname(raw: string): string | null {
  const nickname = raw.trim();
  if (nickname.length < 3) return 'Минимум 3 символа';
  if (nickname.length > 20) return 'Максимум 20 символов';
  if (!NICKNAME_RE.test(nickname)) return 'Только буквы, цифры, пробел, «_», «.» и «-»';
  return null;
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

export async function uploadScore(entry: PlayerEntry): Promise<void> {
  const { id, ...data } = entry;
  let query = '';
  if (isAuthEnabled()) {
    const auth = await getAuth();
    if (auth.uid !== id) throw new Error('Player id does not match the signed-in user');
    query = `?auth=${encodeURIComponent(auth.idToken)}`;
  }
  const res = await fetch(`${FIREBASE_DB_URL}/leaderboard/${encodeURIComponent(id)}.json${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // Server time lets the database rules limit how fast XP can grow.
    body: JSON.stringify({ ...data, updatedAt: { '.sv': 'timestamp' } }),
  });
  if (!res.ok) throw new Error(`Leaderboard upload failed: ${res.status}`);
}

function toEntry(id: string, raw: Record<string, unknown>): PlayerEntry | null {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const nickname = typeof raw.nickname === 'string' ? raw.nickname : null;
  // Entries from the first app version have no nickname: hide them.
  if (!nickname) return null;
  return {
    id,
    nickname,
    xp: num(raw.xp),
    weekXp: num(raw.weekXp),
    week: typeof raw.week === 'string' ? raw.week : '',
    level: num(raw.level) || 1,
    streak: num(raw.streak),
  };
}

/**
 * Top players by `orderBy`. Ordering by weekXp needs a database index; without
 * it Firebase answers 400, and we fall back to the all-time order.
 */
export async function fetchPlayers(orderBy: 'xp' | 'weekXp' = 'xp'): Promise<PlayerEntry[]> {
  const query = (key: string) =>
    fetch(
      `${FIREBASE_DB_URL}/leaderboard.json?orderBy=${encodeURIComponent(`"${key}"`)}&limitToLast=${FETCH_LIMIT}`,
    );
  let res = await query(orderBy);
  if (!res.ok && orderBy !== 'xp') res = await query('xp');
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const data = (await res.json()) as Record<string, Record<string, unknown>> | null;
  if (!data) return [];
  return Object.entries(data)
    .map(([id, raw]) => toEntry(id, raw))
    .filter((e): e is PlayerEntry => e !== null);
}

export function rankWeekly(players: PlayerEntry[], week: string): PlayerEntry[] {
  return players.filter(p => p.week === week && p.weekXp > 0).sort((a, b) => b.weekXp - a.weekXp);
}

export function rankAllTime(players: PlayerEntry[]): PlayerEntry[] {
  return [...players].sort((a, b) => b.xp - a.xp);
}
