/**
 * Validates the learning content in /content.
 *
 *   npm run validate:content              # all sections
 *   npm run validate:content -- async     # run code only for the listed sections
 *
 * 1. Every file is parsed with the zod schema from src/content/schema.ts.
 * 2. Cross-file checks: sections.json ↔ content/index.ts ↔ lesson files,
 *    unique ids, answer indexes in range, solvable `order` questions.
 * 3. The code of every `output` question is run in a sandbox (timers and
 *    promises included) and compared with the option marked as correct.
 *    For `findBug` questions with `fixed`, both versions are run: the bug
 *    must change the output.
 *
 * Exits with code 1 if any error is found. Warnings do not fail the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ZodError } from 'zod';
import { SECTION_FILES } from '../content';
import {
  SectionFileSchema,
  SectionsFileSchema,
  type Lesson,
  type Question,
  type SectionDef,
} from '../src/content/schema';
import { checkFindBugFix, checkFindBugLines } from './lib/check-find-bug';
import { candidateAnswers, normalizeOutput, runSnippet } from './lib/run-snippet';

const CONTENT_DIR = path.join(__dirname, '..', 'content');

const errors: string[] = [];
const warnings: string[] = [];
const error = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    error(file, err.code === 'ENOENT' ? 'file not found' : `invalid JSON: ${err.message}`);
    return null;
  }
}

const CONTAINER_KEYS = new Set(['sections', 'topics', 'lessons', 'questions', 'blocks']);

/** Formats a zod error with a readable path, e.g. `lessons[3].questions[1].correct`. */
function reportZod(file: string, data: unknown, err: ZodError) {
  for (const issue of err.issues) {
    let where = file;
    let node: unknown = data;
    for (const key of issue.path) {
      node = (node as Record<string | number, unknown> | undefined)?.[key];
      const nodeId = (node as { id?: unknown } | undefined)?.id;
      if (typeof key === 'number')
        where += typeof nodeId === 'string' ? ` › ${nodeId}` : `[${key}]`;
      else if (!CONTAINER_KEYS.has(key)) where += `.${key}`;
    }
    error(where, issue.message);
  }
  warn(file, 'schema errors found, other checks for this file were skipped');
}

function checkUnique(where: string, values: unknown[], what: string) {
  const seen = new Set<unknown>();
  for (const v of values) {
    if (seen.has(v)) error(where, `duplicate ${what}: ${String(v)}`);
    seen.add(v);
  }
}

// ─── Sections ───────────────────────────────────────────────────────────────

function loadSections(): SectionDef[] {
  const data = readJson('sections.json');
  if (data === null) return [];
  const parsed = SectionsFileSchema.safeParse(data);
  if (!parsed.success) {
    reportZod('sections.json', data, parsed.error);
    return [];
  }
  const { sections } = parsed.data;
  checkUnique(
    'sections.json',
    sections.map(s => s.id),
    'section id',
  );
  checkUnique(
    'sections.json',
    sections.map(s => s.order),
    'section order',
  );
  checkUnique(
    'sections.json',
    sections.flatMap(s => s.topics.map(t => t.id)),
    'topic id (topic ids must be unique across all sections)',
  );
  for (const s of sections) {
    checkUnique(
      `sections.json › ${s.id}`,
      s.topics.map(t => t.order),
      'topic order',
    );
  }

  const registered = new Set(Object.keys(SECTION_FILES));
  for (const s of sections) {
    if (!registered.has(s.id)) {
      error('content/index.ts', `section "${s.id}" is not registered in SECTION_FILES`);
    }
    if (!fs.existsSync(path.join(CONTENT_DIR, `${s.id}.json`))) {
      error(`${s.id}.json`, 'file not found (lesson file must be named after the section id)');
    }
  }
  for (const sectionId of registered) {
    if (!sections.some(s => s.id === sectionId)) {
      error('content/index.ts', `SECTION_FILES has "${sectionId}", which is not in sections.json`);
    }
  }
  return sections;
}

// ─── Lessons ────────────────────────────────────────────────────────────────

function loadLessons(section: SectionDef): Lesson[] {
  const file = `${section.id}.json`;
  const data = readJson(file);
  if (data === null) return [];
  const parsed = SectionFileSchema.safeParse(data);
  if (!parsed.success) {
    reportZod(file, data, parsed.error);
    return [];
  }
  const { lessons } = parsed.data;
  const topicIds = new Set(section.topics.map(t => t.id));
  for (const lesson of lessons) {
    if (!topicIds.has(lesson.topicId)) {
      error(
        `${file} › ${lesson.id}`,
        `topicId "${lesson.topicId}" is not a topic of section "${section.id}" in sections.json`,
      );
    }
  }
  for (const topic of section.topics) {
    const topicLessons = lessons.filter(l => l.topicId === topic.id);
    if (topicLessons.length === 0) error(`${file} › ${topic.id}`, 'topic has no lessons');
    checkUnique(
      `${file} › ${topic.id}`,
      topicLessons.map(l => l.order),
      'lesson order',
    );
  }
  for (const lesson of lessons) {
    for (const q of lesson.questions) checkQuestion(`${file} › ${q.id}`, q);
  }
  return lessons;
}

function checkQuestion(where: string, q: Question) {
  if (q.type === 'order') {
    const n = q.lines.length;
    if (new Set(q.lines).size !== n) {
      error(where, 'identical "lines": several orders are correct, but only one is accepted');
    }
    const sh = q.shuffled;
    const isPermutation =
      sh.length === n && sh.every(i => i >= 0 && i < n) && new Set(sh).size === n;
    if (!isPermutation) error(where, `"shuffled" must be a permutation of 0..${n - 1}`);
    else if (sh.every((v, i) => v === i))
      error(where, '"shuffled" is already in the correct order');
    if (!q.steps) {
      try {
        new Function(q.lines.join('\n'));
      } catch (e) {
        error(
          where,
          `lines in the correct order are not valid code (${(e as Error).message}); ` +
            'if they are steps in words, set "steps": true',
        );
      }
    }
    return;
  }
  if (q.type === 'findBug') {
    const issues = checkFindBugLines(q);
    for (const e of issues.errors) error(where, e);
    for (const w of issues.warnings) warn(where, w);
    return;
  }
  if (q.correct >= q.options.length) {
    error(where, `"correct" must be an index into options (0..${q.options.length - 1})`);
  }
  if (new Set(q.options.map(o => o.trim())).size !== q.options.length) {
    error(where, 'duplicate options (options must look different on screen)');
  }
  if (q.optionExplanations && q.optionExplanations.length !== q.options.length) {
    error(where, '"optionExplanations" must have the same length as "options"');
  }
  if (q.type === 'fill' && !q.codeBefore.trim() && !q.codeAfter.trim()) {
    error(where, 'fill question has empty code');
  }
}

// ─── Running `output` questions ─────────────────────────────────────────────

async function checkOutputQuestion(where: string, q: Question) {
  if (q.type !== 'output' || q.correct >= q.options.length) return;
  const run = await runSnippet(q.code);
  const candidates = candidateAnswers(run);
  const matching = q.options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => candidates.has(normalizeOutput(o)));
  const printed =
    run.lines.join(' | ') + (run.error ? `${run.lines.length ? ' | ' : ''}<${run.error}>` : '');
  const expected = JSON.stringify(q.options[q.correct]);

  if (run.error === 'Timeout') {
    warn(where, 'code did not finish within the time limit, cannot verify');
  } else if (matching.length === 0) {
    error(where, `code prints [${printed}], which matches no option; marked correct: ${expected}`);
  } else if (!matching.some(m => m.i === q.correct)) {
    const m = matching[0];
    error(
      where,
      `code prints [${printed}], which matches option ${m.i} ${JSON.stringify(m.o)}, ` +
        `but option ${q.correct} ${expected} is marked correct`,
    );
  } else if (matching.length > 1) {
    const all = matching.map(m => JSON.stringify(m.o)).join(', ');
    warn(where, `several options match the output [${printed}]: ${all}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const only = new Set(process.argv.slice(2));
  const sections = loadSections();
  for (const sectionId of only) {
    if (!sections.some(s => s.id === sectionId)) error('args', `unknown section "${sectionId}"`);
  }

  const lessonIds: string[] = [];
  const questionIds: string[] = [];
  let lessonCount = 0;
  let questionCount = 0;
  let executed = 0;
  let withTheory = 0;

  for (const section of sections) {
    const lessons = loadLessons(section);
    lessonIds.push(...lessons.map(l => l.id));
    questionIds.push(...lessons.flatMap(l => l.questions.map(q => q.id)));
    lessonCount += lessons.length;
    withTheory += lessons.filter(l => l.theory).length;
    for (const lesson of lessons) {
      questionCount += lesson.questions.length;
      if (only.size > 0 && !only.has(section.id)) continue;
      for (const q of lesson.questions) {
        const where = `${section.id}.json › ${q.id}`;
        if (q.type === 'output') {
          await checkOutputQuestion(where, q);
          executed++;
        } else if (q.type === 'findBug' && q.fixed !== undefined) {
          for (const w of await checkFindBugFix(q)) warn(where, w);
          executed += 2;
        }
      }
    }
  }
  checkUnique('content', lessonIds, 'lesson id');
  checkUnique('content', questionIds, 'question id');

  for (const w of warnings) console.log(`⚠️  ${w}`);
  for (const e of errors) console.log(`❌ ${e}`);
  console.log(
    `\n${sections.length} sections, ${lessonCount} lessons (${withTheory} with theory), ` +
      `${questionCount} questions, ${executed} snippets executed — ` +
      `${errors.length} errors, ${warnings.length} warnings`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
