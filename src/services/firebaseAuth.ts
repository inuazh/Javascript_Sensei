/**
 * Firebase Anonymous Auth over REST (no Firebase SDK needed).
 * Enabled when a Web API key is configured (app.json → expo.extra.firebaseApiKey
 * or EXPO_PUBLIC_FIREBASE_API_KEY). Without a key the leaderboard writes
 * unauthenticated, which only works with open database rules.
 * See docs/firebase.md.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'js-sensei-auth';
const EXPIRY_MARGIN_MS = 60_000;

export const FIREBASE_API_KEY: string =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
  (Constants.expoConfig?.extra?.firebaseApiKey as string | undefined) ??
  '';

export const isAuthEnabled = () => FIREBASE_API_KEY.length > 0;

interface Session {
  uid: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}

let session: Session | null = null;
let pending: Promise<Session> | null = null;

async function save(s: Session) {
  session = s;
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ uid: s.uid, refreshToken: s.refreshToken }),
  );
}

async function signUp(): Promise<Session> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  if (!res.ok) throw new Error(`Anonymous sign-up failed: ${res.status}`);
  const data = (await res.json()) as {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  const s = {
    uid: data.localId,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + Number(data.expiresIn) * 1000,
  };
  await save(s);
  return s;
}

async function refresh(uid: string, refreshToken: string): Promise<Session> {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!res.ok) {
    // 400 means the refresh token is invalid or the user is gone; anything
    // else (5xx, network) is temporary and must not create a new identity.
    throw Object.assign(new Error(`Token refresh failed: ${res.status}`), {
      permanent: res.status === 400,
    });
  }
  const data = (await res.json()) as {
    id_token: string;
    refresh_token: string;
    user_id: string;
    expires_in: string;
  };
  const s = {
    uid: data.user_id ?? uid,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
  await save(s);
  return s;
}

async function obtain(): Promise<Session> {
  if (session && session.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return session;
  const stored = session ?? JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? 'null');
  if (stored?.refreshToken) {
    try {
      return await refresh(stored.uid, stored.refreshToken);
    } catch (e) {
      if (!(e as { permanent?: boolean }).permanent) throw e;
      // The account is gone; start a new one.
    }
  }
  return signUp();
}

/** Current anonymous user, signing up on first use. */
export async function getAuth(): Promise<{ uid: string; idToken: string }> {
  if (!isAuthEnabled()) throw new Error('Firebase auth is not configured');
  pending ??= obtain().finally(() => {
    pending = null;
  });
  const s = await pending;
  return { uid: s.uid, idToken: s.idToken };
}
