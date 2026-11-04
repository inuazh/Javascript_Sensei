import type { Lesson, SectionDef, TheoryBlock } from '../../../content/schema';
import {
  normalizeQuery,
  buildTheoryIndex,
  makeSnippet,
  normalize,
  plainText,
  searchTheory,
  type Snippet,
  type TheoryHit,
} from '../search';
import { getTheoryIndex } from '../theoryIndex';

const section = (id: string, topics: [string, string][]): SectionDef => ({
  id,
  title: `Раздел ${id}`,
  icon: '*',
  color: '#FFFFFF',
  order: 0,
  topics: topics.map(([topicId, title], order) => ({ id: topicId, title, subtitle: 's', order })),
});

const lesson = (id: string, topicId: string, title: string, blocks?: TheoryBlock[]): Lesson => ({
  id,
  topicId,
  title,
  order: 0,
  theory: blocks ? { blocks } : undefined,
  questions: [],
});

const SECTIONS = [
  section('basics', [
    ['variables', 'Переменные'],
    ['functions', 'Функции'],
  ]),
  section('advanced', [['closures', 'Замыкания']]),
];

const LESSONS: Record<string, Lesson[]> = {
  variables: [
    lesson('variables-01', 'variables', 'Что такое переменная', [
      {
        type: 'text',
        text: 'Переменная — это **именованное** хранилище. Объявлённая через `let`.',
      },
    ]),
    lesson('variables-02', 'variables', 'Без теории'),
    lesson('variables-03', 'variables', 'Константы', [
      { type: 'text', text: 'Ёлка и `const`: значение нельзя переприсвоить.' },
    ]),
  ],
  functions: [
    lesson('functions-01', 'functions', 'Функции и область видимости', [
      { type: 'text', text: 'Функция видит внешние переменные — так появляется замыкание.' },
      { type: 'code', code: 'function makeCounter() {\n  let count = 0;\n}', caption: 'счётчик' },
    ]),
  ],
  closures: [
    lesson('closures-01', 'closures', 'Функция возвращает функцию', [
      { type: 'text', text: 'Внутренняя функция запоминает окружение.' },
    ]),
    lesson('closures-02', 'closures', 'Замыкания в циклах', [
      { type: 'tip', text: 'Используй `let` в цикле.' },
    ]),
  ],
};

const index = buildTheoryIndex(SECTIONS, topicId => LESSONS[topicId] ?? []);
const ids = (hits: TheoryHit[]) => hits.map(h => h.entry.lessonId);
const whole = (s: Snippet | null) => (s ? s.before + s.match + s.after : null);

describe('normalize and plainText', () => {
  it('lowercases and maps ё to е without changing the length', () => {
    expect(normalize('Ёлка ЁЖ Hello')).toBe('елка еж hello');
    const s = 'Объявлённая İ';
    expect(normalize(s)).toHaveLength(s.length);
  });

  it('strips inline markup and collapses whitespace', () => {
    expect(plainText('Метод `map`  создаёт\n**новый** массив')).toBe(
      'Метод map создаёт новый массив',
    );
  });
});

describe('buildTheoryIndex', () => {
  it('keeps lessons with theory in course order with course-map numbers', () => {
    expect(index.entries.map(e => [e.lessonId, e.number])).toEqual([
      ['variables-01', '1.1.1'],
      ['variables-03', '1.1.3'],
      ['functions-01', '1.2.1'],
      ['closures-01', '2.1.1'],
      ['closures-02', '2.1.2'],
    ]);
  });

  it('indexes text, code and captions', () => {
    const fn = index.entries.find(e => e.lessonId === 'functions-01')!;
    expect(fn.body.map(f => [f.text, f.code])).toEqual([
      ['Функция видит внешние переменные — так появляется замыкание.', false],
      ['function makeCounter() { let count = 0; }', true],
      ['счётчик', false],
    ]);
  });
});

describe('searchTheory', () => {
  it('finds nothing for an empty query', () => {
    expect(searchTheory(index, '')).toEqual([]);
    expect(searchTheory(index, '   ')).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(ids(searchTheory(index, 'MAKECOUNTER'))).toEqual(['functions-01']);
  });

  it('treats ё and е as the same letter, both ways', () => {
    expect(ids(searchTheory(index, 'объявленная'))).toEqual(['variables-01']);
    expect(ids(searchTheory(index, 'елка'))).toEqual(['variables-03']);
    expect(ids(searchTheory(index, 'ёлка'))).toEqual(['variables-03']);
    expect(ids(searchTheory(index, 'счетчик'))).toEqual(['functions-01']);
  });

  it('ignores inline markup in the text and in the query', () => {
    expect(ids(searchTheory(index, 'именованное хранилище'))).toEqual(['variables-01']);
    expect(ids(searchTheory(index, 'через let'))).toEqual(['variables-01']);
    expect(ids(searchTheory(index, '`const`: значение'))).toEqual(['variables-03']);
    expect(ids(searchTheory(index, '**именованное**'))).toEqual(['variables-01']);
  });

  it('keeps a lone ** in the query: it is the exponent operator', () => {
    expect(normalizeQuery('2 ** 10')).toBe('2 ** 10');
    expect(normalizeQuery('**')).toBe('**');
    expect(normalizeQuery('**жирный** `код`')).toBe('жирный код');
  });

  it('ranks lesson titles, then topic titles, then the theory text', () => {
    // closures-02: lesson title; closures-01: topic title; functions-01: text, though earlier.
    expect(ids(searchTheory(index, 'замыкани'))).toEqual([
      'closures-02',
      'closures-01',
      'functions-01',
    ]);
  });

  it('prefers matches at the start of a word', () => {
    const strings = buildTheoryIndex([section('strings', [['methods', 'Методы']])], () => [
      lesson('s-01', 'methods', 'Подстрока', [{ type: 'text', text: 'slice' }]),
      lesson('s-02', 'methods', 'Строка как массив', [{ type: 'text', text: 'at' }]),
    ]);
    expect(ids(searchTheory(strings, 'строка'))).toEqual(['s-02', 's-01']);
  });

  it('matches words found in different places after phrase matches', () => {
    const hits = searchTheory(index, 'константы переприсвоить');
    expect(ids(hits)).toEqual(['variables-03']);
    expect(hits[0].titleMatch?.match).toBe('Константы');
  });

  it('emphasises the match in the snippet, without markup', () => {
    const [hit] = searchTheory(index, 'Хранилище');
    expect(hit.titleMatch).toBeNull();
    expect(hit.snippet).toMatchObject({ match: 'хранилище', code: false });
    // A little context before the match, so it stays visible on one line.
    expect(whole(hit.snippet)).toBe('…— это именованное хранилище. Объявлённая через let.');
  });

  it('shows code snippets as code', () => {
    const [hit] = searchTheory(index, 'let count');
    expect(hit.snippet).toMatchObject({ match: 'let count', code: true });
  });

  it('falls back to the start of the theory when only the title matches', () => {
    const [hit] = searchTheory(index, 'константы');
    expect(hit.titleMatch).toEqual({ before: '', match: 'Константы', after: '', code: false });
    expect(hit.snippet?.match).toBe('');
    expect(whole(hit.snippet)).toBe('Ёлка и const: значение нельзя переприсвоить.');
  });
});

describe('makeSnippet', () => {
  const text = `${'слово '.repeat(20)}цель ${'хвост '.repeat(40)}`.trim();
  const f = { text, norm: normalize(text), code: false };

  it('keeps a little context before the match and cuts long text at a word', () => {
    const s = makeSnippet(f, text.indexOf('цель'), 4);
    expect(s.before.startsWith('…')).toBe(true);
    expect(s.before.length).toBeLessThanOrEqual(26);
    expect(s.match).toBe('цель');
    expect(s.after.endsWith('хвост…')).toBe(true);
  });
});

describe('content index', () => {
  it('covers the bundled theory and finds closures', () => {
    const real = getTheoryIndex();
    expect(real.entries.length).toBeGreaterThan(0);
    expect(getTheoryIndex()).toBe(real); // built once
    const hits = searchTheory(real, 'замыкани');
    expect(hits[0].titleMatch?.match.toLowerCase()).toBe('замыкани');
  });
});
