/**
 * Leaderboard nicknames. The format check is the same regular expression as
 * in database.rules.json, so a nickname the app accepts is never rejected by
 * the server. Reserved names are only checked here (the rules cannot map
 * look-alike letters).
 */

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

const CYRILLIC = 'А-Яа-яЁё';
const LETTER_OR_DIGIT = `0-9A-Za-z${CYRILLIC}`;

/**
 * Latin or Russian letters, digits, «_», «.», «-» and inner spaces, 2–20 characters.
 * Keep in sync with leaderboard/$uid/nickname in database.rules.json.
 */
export const NICKNAME_RE = new RegExp(
  `^[${LETTER_OR_DIGIT}_.-][${LETTER_OR_DIGIT}_. -]{${NICKNAME_MIN - 2},${NICKNAME_MAX - 2}}[${LETTER_OR_DIGIT}_.-]$`,
);
const LATIN_RE = /[A-Za-z]/;
const CYRILLIC_RE = new RegExp(`[${CYRILLIC}]`);

/** Cyrillic letters and digits that look like Latin letters. */
const LOOK_ALIKES: Record<string, string> = {
  а: 'a',
  в: 'b',
  е: 'e',
  ё: 'e',
  з: 'e',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  п: 'n',
  р: 'p',
  с: 'c',
  т: 't',
  у: 'y',
  х: 'x',
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  i: 'l',
};

/**
 * Lower case, separators removed, Cyrillic and digit look-alikes mapped to
 * Latin letters: «JS_Sensei», «js.sensei» and «Adm1n» compare equal to
 * «js sensei» and «admin».
 */
export function normalizeNickname(nickname: string): string {
  return Array.from(nickname.toLowerCase().replace(/[\s_.-]/g, ''))
    .map(ch => LOOK_ALIKES[ch] ?? ch)
    .join('');
}

const RESERVED = [
  'admin',
  'administrator',
  'moderator',
  'mod',
  'support',
  'official',
  'system',
  'root',
  'owner',
  'developer',
  'js sensei',
  'javascript sensei',
  'sensei',
  'админ',
  'администратор',
  'модератор',
  'поддержка',
  'сенсей',
].map(normalizeNickname);

/** Names that look like staff: reserved words, also with a prefix-match for the long ones. */
export function isReservedNickname(nickname: string): boolean {
  const n = normalizeNickname(nickname);
  return RESERVED.some(r => n === r || (r.length >= 5 && n.startsWith(r)));
}

/** Error message for the user, or null if the nickname can be used. */
export function validateNickname(raw: string): string | null {
  const nickname = raw.trim();
  if (nickname.length < NICKNAME_MIN) return `минимум ${NICKNAME_MIN} символа`;
  if (nickname.length > NICKNAME_MAX) return `максимум ${NICKNAME_MAX} символов`;
  if (!NICKNAME_RE.test(nickname)) {
    return 'только латиница или кириллица, цифры, пробел, «_», «.» и «-»';
  }
  if (LATIN_RE.test(nickname) && CYRILLIC_RE.test(nickname)) {
    return 'не смешивай латиницу и кириллицу';
  }
  if (isReservedNickname(nickname)) return 'этот ник занят';
  return null;
}
