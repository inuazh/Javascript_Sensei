// Checks database.rules.json against the Realtime Database emulator, including
// the attacks the rules must stop. Needs Java; not part of `npm run check`.
//
//   npx firebase-tools emulators:start --only database   # port 9000
//   node scripts/test-database-rules.mjs                 # SLOW=1 adds a 1-minute burst test
//
// RTDB_EMULATOR overrides the emulator URL (default http://localhost:9000).
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RULES =
  process.env.RULES ??
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database.rules.json');
const DB = process.env.RTDB_EMULATOR ?? 'http://localhost:9000';
const NS = `ns=rulestest${Date.now()}`;
const DAY = 86_400_000;
const APP_START = 1775001600000; // 2026-04-01, as in the rules

// The emulator does not check signatures: an unsigned JWT sets auth.uid.
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = uid =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    sub: uid,
    user_id: uid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    aud: 'rulestest',
    iss: 'https://securetoken.google.com/rulestest',
    firebase: { sign_in_provider: 'anonymous' },
  })}.`;

async function req(method, at, { uid, body, query = '', admin } = {}) {
  const auth = uid ? `&auth=${token(uid)}` : '';
  const headers = admin ? { Authorization: 'Bearer owner' } : {};
  const res = await fetch(`${DB}/${at}.json?${NS}${auth}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

let failures = 0;
async function expect(name, promise, ok) {
  const r = await promise;
  const passed = (r.status === 200) === ok;
  if (!passed) failures++;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} -> ${r.status} ${passed ? '' : r.body}`);
  return r;
}
function check(name, passed, detail = '') {
  if (!passed) failures++;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} ${detail}`);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const today = Math.floor(Date.now() / DAY);
const monday = today - ((((today - 4) % 7) + 7) % 7);
const appAge = 1 + Math.floor((Date.now() - APP_START) / DAY);
const ts = { '.sv': 'timestamp' };
const lb = (o = {}) => ({ nickname: 'Alice', xp: 100, streak: 2, updatedAt: ts, ...o });
const wk = (o = {}) => ({
  nickname: 'Alice',
  xp: 100,
  weekXp: 50,
  week: monday,
  streak: 2,
  updatedAt: ts,
  ...o,
});
/** Multi-path write of both entries, as the app does; `l` is copied into the weekly entry. */
const both = (uid, l = {}, w = {}, week = monday) => ({
  [`leaderboard/${uid}`]: lb(l),
  [`weekly/${week}/${uid}`]: wk({ week, ...l, ...w }),
});
const top = '&orderBy="xp"&limitToLast=200';
const weekTop = '&orderBy="weekXp"&limitToLast=200';

const loaded = await req('PUT', '.settings/rules', {
  admin: true,
  body: JSON.parse(fs.readFileSync(RULES, 'utf8')),
});
if (loaded.status !== 200) {
  console.error('Could not load the rules:', loaded.status, loaded.body);
  process.exit(1);
}

// Ownership and shape
await expect('anon cannot write', req('PATCH', '', { body: both('u1') }), false);
await expect('cannot write other uid', req('PATCH', '', { uid: 'u2', body: both('u1') }), false);
await expect('own multi-path write', req('PATCH', '', { uid: 'u1', body: both('u1') }), true);
await expect('leaderboard only', req('PUT', 'leaderboard/u3', { uid: 'u3', body: lb() }), true);
await expect(
  'extra field',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ level: 3 }) }),
  false,
);
await expect(
  'client updatedAt',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ updatedAt: 1 }) }),
  false,
);
await expect(
  'new xp > 20000',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ xp: 20001 }) }),
  false,
);
await expect(
  'xp 1e300',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ xp: 1e300 }) }),
  false,
);
await expect(
  'fractional xp',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ xp: 10.5 }) }),
  false,
);
await expect(
  'xp as string',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: lb({ xp: '100' }) }),
  false,
);
await expect(
  '.priority on entry',
  req('PUT', 'leaderboard/u4', { uid: 'u4', body: { ...lb(), '.priority': 'x'.repeat(700) } }),
  false,
);
await expect(
  '.priority on field',
  req('PUT', 'leaderboard/u3/nickname', {
    uid: 'u3',
    body: { '.value': 'Alice', '.priority': 'x'.repeat(700) },
  }),
  false,
);

// XP growth
await expect(
  'xp +900 at once',
  req('PATCH', '', { uid: 'u1', body: both('u1', { xp: 1000 }) }),
  false,
);
let xp = 100;
let accepted = 0;
for (let i = 0; i < 5; i++) {
  const r = await req('PATCH', '', { uid: 'u1', body: both('u1', { xp: xp + 1000 }) });
  if (r.status === 200) {
    xp += 1000;
    accepted++;
  }
}
check('write loop cannot add 1000 per request', accepted === 0, `(accepted ${accepted} of 5)`);
await sleep(1100);
await expect(
  'xp +10 after 1 s',
  req('PATCH', '', { uid: 'u1', body: both('u1', { xp: 110 }) }),
  true,
);
await expect(
  'xp may drop',
  req('PATCH', '', { uid: 'u1', body: both('u1', { xp: 10 }, { weekXp: 10 }) }),
  true,
);

// Nicknames
for (const [nick, ok] of [
  ['Al', true],
  ['A', false],
  ['Ян', true],
  ['Пётр_1.2-3 x', false], // mixed: x is Latin
  ['Пётр_1.2-3 ё', true],
  ['js sensei fan', true],
  ['a'.repeat(20), true],
  ['a'.repeat(21), false],
  ['a'.repeat(10000), false],
  [' Alice', false],
  ['Alice ', false],
  ['Ali​ce', false],
  ['Ali‮ce', false],
  ['Ali\nce', false],
  ['Alicе', false], // Cyrillic е at the end
  ['Ünal', false],
  ['\u{1f4a9}\u{1f4a9}', false],
  [42, false],
]) {
  await expect(
    `nickname ${JSON.stringify(nick).slice(0, 30)}`,
    req('PUT', 'leaderboard/n1', { uid: 'n1', body: lb({ nickname: nick, xp: 0, streak: 0 }) }),
    ok,
  );
}

// Streak
await expect(
  'streak needs xp',
  req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ xp: 0, streak: 1 }) }),
  false,
);
await expect(
  'new streak too long',
  req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ streak: appAge + 1 }) }),
  false,
);
await expect(
  'new streak = app age',
  req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ streak: appAge - 5 }) }),
  true,
);
await expect(
  'streak +1',
  req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ streak: appAge - 4 }) }),
  true,
);
await expect(
  'streak +3',
  req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ streak: appAge - 1 }) }),
  false,
);
let streak = appAge - 4;
for (let i = 0; i < 10; i++) {
  const r = await req('PUT', 'leaderboard/s1', { uid: 's1', body: lb({ streak: streak + 1 }) });
  if (r.status === 200) streak++;
}
check(
  'write loop cannot push the streak past the app age',
  streak === appAge,
  `(${streak} / ${appAge})`,
);

// Weekly
await expect(
  'weekly without leaderboard entry',
  req('PUT', `weekly/${monday}/w1`, { uid: 'w1', body: wk() }),
  false,
);
await expect(
  'weekly copy mismatch',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, { xp: 99 }) }),
  false,
);
await expect(
  'weekly xp as string',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, { xp: '100' }) }),
  false,
);
await expect(
  'weekly nickname mismatch',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, { nickname: 'Bob' }) }),
  false,
);
await expect(
  'weekXp > xp',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, { weekXp: 101 }) }),
  false,
);
await expect(
  'weekXp 0',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, { weekXp: 0 }) }),
  false,
);
await expect(
  'week key mismatch',
  req('PUT', `weekly/${monday - 7}/u1`, { uid: 'u1', body: wk({ xp: 10, weekXp: 10 }) }),
  false,
);
await expect(
  'week not a monday',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, {}, monday + 1) }),
  false,
);
await expect(
  'week key not a number',
  req('PUT', 'weekly/abc/w1', { uid: 'w1', body: wk() }),
  false,
);
await expect(
  'week as string',
  req('PATCH', '', {
    uid: 'w1',
    body: { 'leaderboard/w1': lb(), 'weekly/2026-11-02/w1': wk({ week: '2026-11-02' }) },
  }),
  false,
);
await expect(
  'week 2 weeks ago',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, {}, monday - 14) }),
  false,
);
await expect(
  'week next week',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, {}, monday + 7) }),
  today - monday === 6,
);
await expect(
  'previous week (time zones)',
  req('PATCH', '', { uid: 'w1', body: both('w1', {}, {}, monday - 7) }),
  today - monday === 0,
);
await expect('current week', req('PATCH', '', { uid: 'w1', body: both('w1') }), true);
await expect(
  'new weekly entry 20000',
  req('PATCH', '', { uid: 'w2', body: both('w2', { xp: 20000 }, { weekXp: 20000 }) }),
  true,
);
await expect(
  'weekly at 100',
  req('PATCH', '', { uid: 'w3', body: both('w3', { xp: 20000 }, { weekXp: 100 }) }),
  true,
);
await expect(
  'weekXp +1000 at once',
  req('PATCH', '', { uid: 'w3', body: both('w3', { xp: 20000 }, { weekXp: 1100 }) }),
  false,
);
await expect(
  'leaderboard + weekly null (no XP this week)',
  req('PATCH', '', {
    uid: 'w1',
    body: { 'leaderboard/w1': lb({ xp: 0, streak: 0 }), [`weekly/${monday}/w1`]: null },
  }),
  true,
);
const afterNull = await req('GET', `weekly/${monday}`, { query: weekTop });
check('weekly entry removed', afterNull.status === 200 && !afterNull.body.includes('"w1"'));

// Reads
await expect('read whole db', req('GET', ''), false);
await expect('read leaderboard unordered', req('GET', 'leaderboard'), false);
await expect('read leaderboard by xp', req('GET', 'leaderboard', { query: top }), true);
await expect(
  'read leaderboard by xp with startAt',
  req('GET', 'leaderboard', { query: `${top}&startAt=0` }),
  true,
);
await expect(
  'read leaderboard by xp 201',
  req('GET', 'leaderboard', { query: '&orderBy="xp"&limitToLast=201' }),
  false,
);
await expect(
  'read leaderboard no limit',
  req('GET', 'leaderboard', { query: '&orderBy="xp"' }),
  false,
);
await expect(
  'read leaderboard by weekXp',
  req('GET', 'leaderboard', { query: '&orderBy="weekXp"&limitToLast=200' }),
  false,
);
await expect(
  'read leaderboard shallow',
  req('GET', 'leaderboard', { query: '&shallow=true' }),
  false,
);
await expect('read one entry', req('GET', 'leaderboard/u1'), false);
await expect('read weekly', req('GET', `weekly/${monday}`, { query: weekTop }), true);
await expect('read all weeks', req('GET', 'weekly'), false);
await expect('read all weeks shallow', req('GET', 'weekly', { query: '&shallow=true' }), false);
await expect(
  'read weekly by $key',
  req('GET', `weekly/${monday}`, { query: '&orderBy="$key"&limitToLast=10' }),
  false,
);
await expect(
  'read weekly first',
  req('GET', `weekly/${monday}`, { query: '&orderBy="weekXp"&limitToFirst=10' }),
  false,
);

// Delete
await expect('delete other', req('DELETE', 'leaderboard/u1', { uid: 'u2' }), false);
await expect(
  'multi-path delete other',
  req('PATCH', '', { uid: 'u2', body: { 'leaderboard/u1': null } }),
  false,
);
await expect('delete a whole week', req('DELETE', `weekly/${monday}`, { uid: 'u1' }), false);
await expect('delete own leaderboard', req('DELETE', 'leaderboard/u1', { uid: 'u1' }), true);
await expect('delete own weekly', req('DELETE', `weekly/${monday}/u1`, { uid: 'u1' }), true);
await expect('delete missing', req('DELETE', `weekly/${monday - 7}/u1`, { uid: 'u1' }), true);

if (process.env.SLOW) {
  await sleep(61_000);
  await expect(
    'burst of 1000 after a minute',
    req('PATCH', '', { uid: 'w2', body: both('w2', { xp: 21000 }, { weekXp: 21000 }) }),
    true,
  );
  await expect(
    'second burst right after',
    req('PATCH', '', { uid: 'w2', body: both('w2', { xp: 22000 }, { weekXp: 22000 }) }),
    false,
  );
}

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
