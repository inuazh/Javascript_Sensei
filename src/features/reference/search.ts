/**
 * Full-text search over lesson theory for «Справочник».
 *
 * Pure functions, no React: `buildTheoryIndex` flattens the content into
 * searchable fields once, `searchTheory` matches a query against them.
 * Matching is case-insensitive, treats `ё` as `е` and ignores the inline
 * markup of theory text (backticks and `**`).
 */
import type { Lesson, SectionDef, TheoryBlock } from '../../content/schema';

/** One piece of searchable text: what is shown and its normalized twin of the same length. */
export interface SearchField {
  text: string;
  norm: string;
  /** Comes from a code block: shown in a monospace font. */
  code: boolean;
}

export interface TheoryEntry {
  lessonId: string;
  lessonTitle: string;
  topicId: string;
  topicTitle: string;
  sectionId: string;
  sectionTitle: string;
  /** Numbers as on the course map, 1-based. */
  sectionNumber: number;
  topicNumber: number;
  lessonNumber: number;
  /** E.g. `6.1.4`. */
  number: string;
  title: SearchField;
  topic: SearchField;
  /** Text, tips, warnings, code and captions of the theory blocks, in order. */
  body: SearchField[];
}

export interface TheoryIndex {
  /** Lessons that have theory, in course order. */
  entries: TheoryEntry[];
}

/** A one-line excerpt split around the matched part (`match` is empty when nothing is emphasised). */
export interface Snippet {
  before: string;
  match: string;
  after: string;
  code: boolean;
}

export interface TheoryHit {
  entry: TheoryEntry;
  /** The lesson title with the match, when the title matched. */
  titleMatch: Snippet | null;
  /** An excerpt of the theory, around the match when there is one in the text. */
  snippet: Snippet | null;
}

// ─── Normalization ──────────────────────────────────────────────────────────

/** Lowercase and `ё` → `е`, keeping the string length so positions map back to the original. */
export function normalize(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const lower = s[i].toLowerCase();
    if (lower.length !== 1) out += s[i];
    else out += lower === 'ё' ? 'е' : lower;
  }
  return out;
}

/** Drops inline markup (`code` backticks, **bold**) and collapses whitespace to single spaces. */
export function plainText(s: string): string {
  return s
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function field(raw: string, code = false): SearchField {
  const text = code ? raw.replace(/\s+/g, ' ').trim() : plainText(raw);
  return { text, norm: normalize(text), code };
}

function blockFields(block: TheoryBlock): SearchField[] {
  if (block.type === 'code') {
    const fields = [field(block.code, true)];
    if (block.caption) fields.push(field(block.caption));
    return fields;
  }
  return [field(block.text)];
}

// ─── Index ──────────────────────────────────────────────────────────────────

/**
 * Builds the search index. `lessonsOf` returns the lessons of a topic in order;
 * lessons without theory keep their number but are left out of the index.
 */
export function buildTheoryIndex(
  sections: readonly SectionDef[],
  lessonsOf: (topicId: string) => readonly Lesson[],
): TheoryIndex {
  const entries: TheoryEntry[] = [];
  sections.forEach((section, s) => {
    section.topics.forEach((topic, t) => {
      lessonsOf(topic.id).forEach((lesson, l) => {
        if (!lesson.theory) return;
        entries.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          topicId: topic.id,
          topicTitle: topic.title,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionNumber: s + 1,
          topicNumber: t + 1,
          lessonNumber: l + 1,
          number: `${s + 1}.${t + 1}.${l + 1}`,
          title: field(lesson.title),
          topic: field(topic.title),
          body: lesson.theory.blocks.flatMap(blockFields),
        });
      });
    });
  });
  return { entries };
}

// ─── Search ─────────────────────────────────────────────────────────────────

/** Characters of context shown before the match in a snippet. */
const CONTEXT_BEFORE = 24;
/** Total length of a snippet, not counting the ellipses. */
const SNIPPET_LENGTH = 110;

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}_$]/u.test(c);

/** Cuts a one-line excerpt of `f` around `[start, start + length)`. */
export function makeSnippet(f: SearchField, start: number, length: number): Snippet {
  const { text } = f;
  const end = start + length;
  let from = Math.max(0, start - CONTEXT_BEFORE);
  if (from > 0) {
    const space = text.indexOf(' ', from);
    if (space >= 0 && space < start) from = space + 1;
  }
  let to = Math.min(text.length, from + Math.max(SNIPPET_LENGTH, end - from));
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to);
    if (space > end) to = space;
  }
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start),
    match: text.slice(start, end),
    after: text.slice(end, to) + (to < text.length ? '…' : ''),
    code: f.code,
  };
}

/**
 * The query as it is matched: normalized, single spaces, without markup.
 * A lone `**` stays, because it is also the exponent operator in code.
 */
export function normalizeQuery(query: string): string {
  const unmarked = query.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '$1').replace(/`/g, '');
  return normalize(unmarked.replace(/\s+/g, ' ').trim());
}

interface Found {
  field: SearchField;
  at: number;
  length: number;
}

function findIn(fields: readonly SearchField[], needle: string): Found | null {
  for (const f of fields) {
    const at = f.norm.indexOf(needle);
    if (at >= 0) return { field: f, at, length: needle.length };
  }
  return null;
}

function firstOf(fields: readonly SearchField[], needles: readonly string[]): Found | null {
  for (const n of needles) {
    const found = findIn(fields, n);
    if (found) return found;
  }
  return null;
}

/** Lower is better. A match at the start of a word beats one inside a word. */
function score(tier: number, found: Found): number {
  return tier * 2 + (isWordChar(found.field.norm[found.at - 1]) ? 1 : 0);
}

/**
 * Lessons whose title, topic or theory contain `query`, best first:
 * lesson title matches, then topic title, then the theory text and code,
 * then lessons that contain every word of the query in different places.
 * Ties keep the course order. An empty query finds nothing.
 */
export function searchTheory(index: TheoryIndex, query: string): TheoryHit[] {
  const phrase = normalizeQuery(query);
  if (!phrase) return [];
  const words = phrase.split(' ');

  const ranked: { hit: TheoryHit; score: number; order: number }[] = [];
  index.entries.forEach((entry, order) => {
    const inTitle = findIn([entry.title], phrase);
    const inTopic = findIn([entry.topic], phrase);
    const inBody = findIn(entry.body, phrase);

    let rank: number;
    let titleFound = inTitle;
    let bodyFound = inBody;
    if (inTitle) rank = score(0, inTitle);
    else if (inTopic) rank = score(1, inTopic);
    else if (inBody) rank = score(2, inBody);
    else {
      // Every word somewhere in the lesson, not necessarily together.
      const all = [entry.title, entry.topic, ...entry.body];
      if (words.length < 2 || words.some(w => !findIn(all, w))) return;
      rank = 3 * 2; // after every phrase match, see score()
      titleFound = firstOf([entry.title], words);
      bodyFound = firstOf(entry.body, words);
    }

    const hit: TheoryHit = {
      entry,
      titleMatch: titleFound ? makeSnippet(entry.title, titleFound.at, titleFound.length) : null,
      snippet: bodyFound
        ? makeSnippet(bodyFound.field, bodyFound.at, bodyFound.length)
        : openingSnippet(entry),
    };
    ranked.push({ hit, score: rank, order });
  });

  return ranked.sort((a, b) => a.score - b.score || a.order - b.order).map(r => r.hit);
}

/** The start of the first text of the theory, with nothing emphasised. */
function openingSnippet(entry: TheoryEntry): Snippet | null {
  const first = entry.body.find(f => !f.code) ?? entry.body[0];
  return first ? makeSnippet(first, 0, 0) : null;
}
