// Replace with your Firebase Realtime Database URL:
// https://console.firebase.google.com → your project → Realtime Database → copy URL
export const FIREBASE_DB_URL = 'https://javascript-sensei-default-rtdb.europe-west1.firebasedatabase.app';

export interface LeaderboardEntry {
  id: string;
  xp: number;
  title: string;   // level title, e.g. "Junior Dev"
  streak: number;
  updatedAt: string;
}

export async function uploadScore(
  deviceId: string,
  xp: number,
  title: string,
  streak: number,
): Promise<void> {
  if (!FIREBASE_DB_URL) return;
  await fetch(`${FIREBASE_DB_URL}/leaderboard/${deviceId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xp, title, streak, updatedAt: new Date().toISOString() }),
  });
}

export async function fetchTopPlayers(limit = 50): Promise<LeaderboardEntry[]> {
  if (!FIREBASE_DB_URL) return [];
  const res = await fetch(
    `${FIREBASE_DB_URL}/leaderboard.json?orderBy="xp"&limitToLast=${limit}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!data) return [];
  return Object.entries(data)
    .map(([id, p]: [string, any]) => ({ id, xp: p.xp ?? 0, title: p.title ?? '', streak: p.streak ?? 0, updatedAt: p.updatedAt ?? '' }))
    .sort((a, b) => b.xp - a.xp);
}
