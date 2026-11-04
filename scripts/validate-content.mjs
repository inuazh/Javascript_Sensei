#!/usr/bin/env node
/**
 * Validates the learning content in /content.
 *
 *   npm run validate:content              # all sections
 *   npm run validate:content -- async     # only the listed sections
 *
 * Structure checks: sections.json ↔ content/index.ts ↔ <section>.json are in sync,
 * ids are unique, answer indexes are in range, `order` questions are solvable.
 *
 * Execution checks: the code of every `output` question is run in a sandbox
 * (timers and promises included) and the printed result is compared with the
 * option marked as correct. If the code prints something that matches a
 * different option, or no option at all, the question is reported.
 *
 * Exits with code 1 if any error is found. Warnings do not fail the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');
const QUESTION_TYPES = new Set(['output', 'fill', 'trueFalse', 'order']);
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RUN_TIMEOUT_MS = 2000;

const errors = [];
const warnings = [];
const error = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ─── Loading ────────────────────────────────────────────────────────────────

function readJson(file) {
  const full = path.join(CONTENT_DIR, file);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    error(file, e.code === 'ENOENT' ? 'file not found' : `invalid JSON: ${e.message}`);
    return null;
  }
}

/** Parses `sectionId: () => require('./file.json')` entries from content/index.ts. */
function readRegistry() {
  const src = fs.readFileSync(path.join(CONTENT_DIR, 'index.ts'), 'utf8');
  const entries = new Map();
  const re = /['"]?([\w-]+)['"]?\s*:\s*\(\)\s*=>\s*require\(\s*['"]\.\/([^'"]+)['"]\s*\)/g;
  for (const m of src.matchAll(re)) entries.set(m[1], m[2]);
  return entries;
}

// ─── Structure checks ───────────────────────────────────────────────────────

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const isIndex = (v, len) => Number.isInteger(v) && v >= 0 && v < len;

function checkSections(data) {
  if (!data || !Array.isArray(data.sections)) {
    error('sections.json', 'expected { "sections": [...] }');
    return [];
  }
  const sectionIds = new Set();
  const topicIds = new Set();
  for (const s of data.sections) {
    const where = `sections.json › ${s.id ?? '?'}`;
    if (!isNonEmptyString(s.id) || !ID_RE.test(s.id)) error(where, `bad section id ${JSON.stringify(s.id)}`);
    if (sectionIds.has(s.id)) error(where, 'duplicate section id');
    sectionIds.add(s.id);
    for (const key of ['title', 'icon', 'color']) {
      if (!isNonEmptyString(s[key])) error(where, `missing "${key}"`);
    }
    if (isNonEmptyString(s.color) && !/^#[0-9a-fA-F]{6}$/.test(s.color)) error(where, `color must be #RRGGBB, got ${s.color}`);
    if (!Number.isInteger(s.order)) error(where, 'missing integer "order"');
    if (!Array.isArray(s.topics) || s.topics.length === 0) {
      error(where, 'section has no topics');
      continue;
    }
    checkOrders(where, s.topics);
    for (const t of s.topics) {
      const tWhere = `${where} › ${t.id ?? '?'}`;
      if (!isNonEmptyString(t.id) || !ID_RE.test(t.id)) error(tWhere, `bad topic id ${JSON.stringify(t.id)}`);
      if (topicIds.has(t.id)) error(tWhere, 'duplicate topic id (topic ids must be unique across all sections)');
      topicIds.add(t.id);
      if (!isNonEmptyString(t.title)) error(tWhere, 'missing "title"');
      if (!isNonEmptyString(t.subtitle)) error(tWhere, 'missing "subtitle"');
    }
  }
  checkOrders('sections.json', data.sections);
  return data.sections;
}

function checkOrders(where, items) {
  const orders = items.map(i => i.order);
  if (orders.some(o => !Number.isInteger(o))) {
    error(where, 'every item needs an integer "order"');
    return;
  }
  if (new Set(orders).size !== orders.length) error(where, `duplicate "order" values: ${orders.join(', ')}`);
}

function checkSectionFile(section, data, seenLessonIds, seenQuestionIds) {
  const file = `${section.id}.json`;
  if (!data || !Array.isArray(data.lessons)) {
    if (data) error(file, 'expected { "lessons": [...] }');
    return [];
  }
  const topicIds = new Set(section.topics.map(t => t.id));
  const byTopic = new Map();
  for (const lesson of data.lessons) {
    const where = `${file} › ${lesson.id ?? '?'}`;
    if (!isNonEmptyString(lesson.id)) error(where, 'missing lesson "id"');
    if (seenLessonIds.has(lesson.id)) error(where, 'duplicate lesson id');
    seenLessonIds.add(lesson.id);
    if (!topicIds.has(lesson.topicId)) {
      error(where, `topicId "${lesson.topicId}" is not a topic of section "${section.id}" in sections.json`);
    } else {
      if (!byTopic.has(lesson.topicId)) byTopic.set(lesson.topicId, []);
      byTopic.get(lesson.topicId).push(lesson);
    }
    if (!isNonEmptyString(lesson.title)) error(where, 'missing "title"');
    if (!Array.isArray(lesson.questions) || lesson.questions.length === 0) {
      error(where, 'lesson has no questions');
      continue;
    }
    for (const q of lesson.questions) checkQuestion(`${file} › ${q.id ?? '?'}`, q, seenQuestionIds);
  }
  for (const t of section.topics) {
    const lessons = byTopic.get(t.id) ?? [];
    if (lessons.length === 0) error(`${file} › ${t.id}`, 'topic has no lessons');
    else checkOrders(`${file} › ${t.id} lessons`, lessons);
  }
  return data.lessons;
}

function checkQuestion(where, q, seenQuestionIds) {
  if (!isNonEmptyString(q.id)) error(where, 'missing question "id"');
  if (seenQuestionIds.has(q.id)) error(where, 'duplicate question id');
  seenQuestionIds.add(q.id);
  if (!QUESTION_TYPES.has(q.type)) {
    error(where, `unknown type ${JSON.stringify(q.type)}`);
    return;
  }
  if (!isNonEmptyString(q.title)) error(where, 'missing "title"');
  if (!isNonEmptyString(q.explanation)) error(where, 'missing "explanation"');

  if (q.type === 'order') {
    if (!Array.isArray(q.lines) || q.lines.length < 2 || !q.lines.every(isNonEmptyString)) {
      error(where, '"lines" must contain at least 2 non-empty strings');
      return;
    }
    if (new Set(q.lines).size !== q.lines.length) {
      warn(where, 'identical "lines": several orders are correct, but only one is accepted');
    }
    const n = q.lines.length;
    const sh = q.shuffled;
    const isPermutation = Array.isArray(sh) && sh.length === n
      && sh.every(i => isIndex(i, n)) && new Set(sh).size === n;
    if (!isPermutation) error(where, `"shuffled" must be a permutation of 0..${n - 1}`);
    else if (sh.every((v, i) => v === i)) error(where, '"shuffled" is already in the correct order');
    return;
  }

  if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(o => typeof o === 'string')) {
    error(where, '"options" must contain at least 2 strings');
    return;
  }
  if (new Set(q.options.map(o => o.trim())).size !== q.options.length) error(where, 'duplicate options');
  if (!isIndex(q.correct, q.options.length)) {
    error(where, `"correct" must be an index into options (0..${q.options.length - 1})`);
  }
  if (q.type === 'output' && !isNonEmptyString(q.code)) error(where, 'output question needs "code"');
  if (q.type === 'fill') {
    if (typeof q.codeBefore !== 'string' || typeof q.codeAfter !== 'string') {
      error(where, 'fill question needs "codeBefore" and "codeAfter" strings');
    } else if (!q.codeBefore.trim() && !q.codeAfter.trim()) {
      error(where, 'fill question has empty code');
    }
  }
}

// ─── Running `output` questions ─────────────────────────────────────────────

const isPlainObject = v => Object.prototype.toString.call(v) === '[object Object]';

/** Formats a value roughly like the browser console does, in the style used by lesson options. */
function formatValue(v, nested = false, seen = new Set()) {
  if (typeof v === 'string') return nested ? JSON.stringify(v) : v;
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'symbol') return v.toString();
  if (typeof v === 'function') return v.name ? `[Function: ${v.name}]` : '[Function (anonymous)]';
  if (v === null || typeof v !== 'object') return String(v);
  if (seen.has(v)) return '[Circular]';
  seen.add(v);
  const fmt = x => formatValue(x, true, seen);
  try {
    if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`;
    const tag = Object.prototype.toString.call(v).slice(8, -1);
    if (tag === 'Map') return `Map(${v.size}) {${[...v].map(([k, x]) => `${fmt(k)} => ${fmt(x)}`).join(', ')}}`;
    if (tag === 'Set') return `Set(${v.size}) {${[...v].map(fmt).join(', ')}}`;
    if (tag === 'Error' || v instanceof Error) return `${v.name}: ${v.message}`;
    if (tag === 'Promise') return 'Promise';
    if (tag === 'Date') return v.toISOString();
    if (isPlainObject(v) || typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 0) return '{}';
      return `{ ${keys.map(k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${fmt(v[k])}`).join(', ')} }`;
    }
  } finally {
    seen.delete(v);
  }
  return String(v);
}

/** Normalisation applied to both program output and options before comparing. */
function normalize(s) {
  return s
    .replace(/'/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/([[{(]) /g, '$1')
    .replace(/ ([\]})])/g, '$1')
    .replace(/ ?, ?/g, ', ')
    .trim();
}

/**
 * Runs code in a fresh context, waiting for timers and promise callbacks.
 * Resolves to { lines, error } where error is the name of the first uncaught error.
 */
async function runSnippet(code) {
  const lines = [];
  let uncaught = null;
  const record = e => { if (!uncaught) uncaught = (e && e.name) || 'Error'; };
  const log = (...args) => lines.push(args.map(a => formatValue(a)).join(' '));
  const timers = new Map();
  let nextTimer = 1;

  const ctx = vm.createContext({
    console: { log, info: log, warn: log, error: log, debug: log },
    setTimeout: (fn, ms = 0, ...args) => {
      const id = nextTimer++;
      timers.set(id, { fn, args, at: Number(ms) || 0, seq: id });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    setInterval: () => { throw new Error('setInterval is not supported by the validator'); },
    queueMicrotask: fn => Promise.resolve().then(fn),
  });
  // Report unhandled rejections from the snippet instead of crashing the validator.
  const onRejection = e => record(e);
  process.on('unhandledRejection', onRejection);

  const flushMicrotasks = () => new Promise(r => setImmediate(r));

  try {
    try {
      vm.runInContext(code, ctx, { timeout: RUN_TIMEOUT_MS, filename: 'snippet.js' });
    } catch (e) {
      record(e);
    }
    await flushMicrotasks();
    // Fake clock: run timers in (delay, creation) order, draining microtasks after each.
    const deadline = Date.now() + RUN_TIMEOUT_MS;
    while (timers.size > 0 && !uncaught) {
      if (Date.now() > deadline) { uncaught = 'Timeout'; break; }
      const [id, t] = [...timers].sort((a, b) => a[1].at - b[1].at || a[1].seq - b[1].seq)[0];
      timers.delete(id);
      try {
        t.fn(...t.args);
      } catch (e) {
        record(e);
      }
      await flushMicrotasks();
    }
    await flushMicrotasks();
  } finally {
    process.off('unhandledRejection', onRejection);
  }
  return { lines, error: uncaught };
}

/** All textual renderings of a run that an option may legitimately use. */
function candidateAnswers({ lines, error }) {
  const out = [];
  const joins = [' ', ', ', '\n'];
  if (!error) {
    if (lines.length === 0) out.push('Ничего', 'Ничего не выведет', '(ничего)');
    for (const j of joins) out.push(lines.join(j));
  } else {
    const errorNames = [error, 'Error', 'Ошибка', `Вызовет ${error}`, 'Вызовет ошибку', 'Вызовет Error'];
    for (const name of errorNames) {
      if (lines.length === 0) out.push(name);
      for (const j of joins) out.push([...lines, name].join(j));
    }
  }
  return new Set(out.map(normalize));
}

async function checkOutputQuestion(where, q) {
  if (!isNonEmptyString(q.code) || !Array.isArray(q.options) || !isIndex(q.correct, q.options.length)) return;
  const run = await runSnippet(q.code);
  const candidates = candidateAnswers(run);
  const matching = q.options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => candidates.has(normalize(o)));
  const printed = run.lines.join(' | ') + (run.error ? `${run.lines.length ? ' | ' : ''}<${run.error}>` : '');
  const expected = q.options[q.correct];

  if (run.error === 'Timeout') {
    warn(where, 'code did not finish within the time limit, cannot verify');
  } else if (matching.length === 0) {
    error(where, `code prints [${printed}], which matches no option; marked correct: ${JSON.stringify(expected)}`);
  } else if (!matching.some(m => m.i === q.correct)) {
    error(where, `code prints [${printed}], which matches option ${matching[0].i} ${JSON.stringify(matching[0].o)}, but option ${q.correct} ${JSON.stringify(expected)} is marked correct`);
  } else if (matching.length > 1) {
    warn(where, `several options match the output [${printed}]: ${matching.map(m => JSON.stringify(m.o)).join(', ')}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const only = new Set(process.argv.slice(2));
  const sections = checkSections(readJson('sections.json'));
  const registry = readRegistry();

  const sectionIds = new Set(sections.map(s => s.id));
  for (const s of sections) {
    if (!registry.has(s.id)) error('content/index.ts', `section "${s.id}" from sections.json is not registered in SECTION_FILES`);
    else if (registry.get(s.id) !== `${s.id}.json`) warn('content/index.ts', `section "${s.id}" loads ${registry.get(s.id)}; expected ${s.id}.json`);
  }
  for (const id of registry.keys()) {
    if (!sectionIds.has(id)) error('content/index.ts', `SECTION_FILES has "${id}", which is not in sections.json`);
  }
  for (const id of only) {
    if (!sectionIds.has(id)) error('args', `unknown section "${id}"`);
  }

  const seenLessonIds = new Set();
  const seenQuestionIds = new Set();
  let lessonCount = 0;
  let questionCount = 0;
  let executed = 0;

  for (const section of sections) {
    if (!sectionIds.has(section.id) || !Array.isArray(section.topics)) continue;
    const file = registry.get(section.id) ?? `${section.id}.json`;
    const lessons = checkSectionFile(section, readJson(file), seenLessonIds, seenQuestionIds);
    if (only.size > 0 && !only.has(section.id)) continue;
    lessonCount += lessons.length;
    for (const lesson of lessons) {
      for (const q of lesson.questions ?? []) {
        questionCount++;
        if (q.type === 'output') {
          await checkOutputQuestion(`${file} › ${q.id}`, q);
          executed++;
        }
      }
    }
  }

  for (const w of warnings) console.log(`⚠️  ${w}`);
  for (const e of errors) console.log(`❌ ${e}`);
  console.log(
    `\n${sections.length} sections, ${lessonCount} lessons, ${questionCount} questions checked, ` +
      `${executed} output snippets executed — ${errors.length} errors, ${warnings.length} warnings`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
