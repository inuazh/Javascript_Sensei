import fs from 'fs';
import path from 'path';
import { NICKNAME_RE, isReservedNickname, normalizeNickname, validateNickname } from '../nickname';

describe('validateNickname', () => {
  it.each(['Al', 'Ян', 'Alice', 'neo_42', 'j.doe-1', 'Пётр Иванов', 'Ёжик', '42', 'a'.repeat(20)])(
    'accepts %j',
    nickname => {
      expect(validateNickname(nickname)).toBeNull();
    },
  );

  it('trims the input first', () => {
    expect(validateNickname('  Alice  ')).toBeNull();
    expect(validateNickname(' A ')).toBe('минимум 2 символа');
  });

  it('checks the length', () => {
    expect(validateNickname('A')).toBe('минимум 2 символа');
    expect(validateNickname('a'.repeat(21))).toBe('максимум 20 символов');
  });

  it.each([
    ['zero-width space', 'Ali​ce'],
    ['right-to-left override', 'Ali‮ce'],
    ['left-to-right mark', 'Ali‎ce'],
    ['newline', 'Ali\nce'],
    ['tab', 'Ali\tce'],
    ['non-breaking space', 'Ali ce'],
    ['emoji', 'Alice🔥'],
    ['Latin with diacritics', 'Ünal'],
    ['Ukrainian і', 'Віка'],
    ['Arabic', 'علي'],
    ['symbols', 'a<b>'],
  ])('rejects %s', (_, nickname) => {
    expect(validateNickname(nickname)).toBe(
      'только латиница или кириллица, цифры, пробел, «_», «.» и «-»',
    );
  });

  it('rejects names that mix Latin and Cyrillic', () => {
    expect(validateNickname('Alicе')).toBe('не смешивай латиницу и кириллицу'); // Cyrillic е
    expect(validateNickname('Петя Pro')).toBe('не смешивай латиницу и кириллицу');
  });

  it.each([
    'admin',
    'Admin',
    'ADM1N',
    'adm_in',
    'Administrator',
    'admin2000',
    'moderator',
    'Moder.ator',
    'mod',
    'JS Sensei',
    'js_sensei',
    'jssensei official',
    'J5 5EN5EI',
    'Sensei',
    'support',
    'Админ',
    'АДМИН',
    'модератор',
    'Сенсей',
  ])('rejects the reserved name %j', nickname => {
    expect(validateNickname(nickname)).toBe('этот ник занят');
  });

  it('allows names that only contain a reserved word in the middle', () => {
    expect(validateNickname('Badminton')).toBeNull();
    expect(validateNickname('modest')).toBeNull();
    expect(validateNickname('rooted')).toBeNull();
  });
});

describe('normalizeNickname', () => {
  it('lowercases, drops separators and maps look-alikes to Latin', () => {
    expect(normalizeNickname('JS_Sensei')).toBe(normalizeNickname('js sensei'));
    expect(normalizeNickname('Adm1n')).toBe(normalizeNickname('admin'));
    // All-Cyrillic spelling of Latin «op» — о and р are look-alikes.
    expect(normalizeNickname('ОР')).toBe('op');
    expect(normalizeNickname('Ёжик')).toBe('eжиk');
  });

  it('matches short reserved words exactly and long ones as a prefix', () => {
    expect(isReservedNickname('ROOT')).toBe(true);
    expect(isReservedNickname('R00T')).toBe(true);
    expect(isReservedNickname('rooted')).toBe(false);
    expect(isReservedNickname('admin_42')).toBe(true);
  });
});

describe('rules and client agree', () => {
  const rules = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../database.rules.json'), 'utf8'),
  ) as { rules: { leaderboard: { $uid: { nickname: { '.validate': string } } } } };
  const rule = rules.rules.leaderboard.$uid.nickname['.validate'];

  it('uses the same nickname pattern as database.rules.json', () => {
    const match = /newData\.val\(\)\.matches\((\/\^.*?\$\/)\)/.exec(rule);
    expect(match?.[1]).toBe(String(NICKNAME_RE));
  });

  it('forbids mixing scripts in the rules too', () => {
    expect(rule).toContain(
      '!(newData.val().matches(/[A-Za-z]/) && newData.val().matches(/[А-Яа-яЁё]/))',
    );
  });
});
