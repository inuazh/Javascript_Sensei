/**
 * Shared fixtures and UI helpers for the e2e specs.
 *
 * Every test fails on an uncaught page error. Requests to Firebase (rating,
 * anonymous auth) are blocked so the tests never touch the real backend; the
 * resulting network errors are not counted as app crashes.
 */
import { expect, test as base, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FIREBASE_HOST =
  /firebasedatabase\.app|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/;

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      let firebaseFailed = false;
      await page.route(FIREBASE_HOST, route => {
        firebaseFailed = true;
        return route.abort('internetdisconnected');
      });
      page.on('pageerror', error => {
        const message = `${error.name}: ${error.message}`;
        const network = /firebase/i.test(message) || /Failed to fetch/i.test(message);
        if (network && firebaseFailed) return;
        errors.push(error.stack ?? message);
      });
      await use(errors);
      expect(errors, 'uncaught errors on the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

// ---------------------------------------------------------------- content

interface ContentQuestion {
  id: string;
  type: string;
  options?: string[];
  correct?: number;
  lines?: string[];
  shuffled?: number[];
}

export interface ContentLesson {
  id: string;
  topicId: string;
  title: string;
  questions: ContentQuestion[];
}

const CONTENT_DIR = path.join(__dirname, '..', 'content');

function loadLessons(): Map<string, ContentLesson> {
  const lessons = new Map<string, ContentLesson>();
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.json') || file === 'sections.json') continue;
    const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
    for (const lesson of data.lessons as ContentLesson[]) lessons.set(lesson.id, lesson);
  }
  return lessons;
}

const LESSONS = loadLessons();

export function getLesson(id: string): ContentLesson {
  const lesson = LESSONS.get(id);
  if (!lesson) throw new Error(`Lesson ${id} not found in content/`);
  return lesson;
}

export function getTopicTitle(topicId: string): string {
  const { sections } = JSON.parse(
    fs.readFileSync(path.join(CONTENT_DIR, 'sections.json'), 'utf8'),
  ) as { sections: { topics: { id: string; title: string }[] }[] };
  const topic = sections.flatMap(s => s.topics).find(t => t.id === topicId);
  if (!topic) throw new Error(`Topic ${topicId} not found in sections.json`);
  return topic.title;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- flows

export type Experience = 'Новичок' | 'Знаю основы' | 'Есть опыт';

/** Goes through onboarding from the welcome screen, declining reminders. */
export async function completeOnboarding(page: Page, experience: Experience = 'Новичок') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать', exact: true }).click();

  await expect(page.getByText('Какой у тебя опыт?')).toBeVisible();
  await page.getByRole('radio', { name: new RegExp(escape(experience)) }).click();
  await page.getByRole('button', { name: 'Дальше' }).click();

  await expect(page.getByText('Цель на день')).toBeVisible();
  await page.getByRole('radio', { name: /Лёгкий/ }).click();
  await page.getByRole('button', { name: 'Дальше' }).click();

  await expect(page.getByText('Когда напомнить?')).toBeVisible();
  await page.getByRole('button', { name: 'Не сейчас' }).click();
}

export function startLessonButton(page: Page) {
  return page.getByRole('button', { name: /Начать урок/ });
}

/** Opens the next lesson from home, skips the theory and returns the lesson. */
export async function openNextLesson(page: Page): Promise<ContentLesson> {
  await startLessonButton(page).click();
  await expect(page).toHaveURL(/\/lesson\/[\w-]+$/);
  const lessonId = new URL(page.url()).pathname.split('/').pop()!;
  const lesson = getLesson(lessonId);
  await page.getByRole('button', { name: /К практике/ }).click();
  return lesson;
}

type AnswerMode = 'correct' | 'wrong' | 'first';

/**
 * Answers every question of a running quiz session. With a lesson, choice
 * questions are answered right or wrong on purpose; order questions are
 * always submitted as shown. Returns how many answers were correct.
 */
export async function answerQuiz(
  page: Page,
  mode: AnswerMode,
  lesson?: ContentLesson,
): Promise<number> {
  // Screens below the quiz stay mounted (hidden), so only visible text counts.
  const counter = page
    .getByText(/^\d+\/\d+$/)
    .filter({ visible: true })
    .first();
  await expect(counter).toHaveText(/^1\/\d+$/);
  const total = Number((await counter.textContent())!.split('/')[1]);
  if (lesson) expect(total).toBe(lesson.questions.length);

  let correct = 0;
  for (let i = 0; i < total; i++) {
    await expect(counter).toHaveText(`${i + 1}/${total}`);
    const radios = page.getByRole('radio');
    const question = lesson?.questions[i];

    if (question?.options && question.correct !== undefined && mode !== 'first') {
      const right = question.options[question.correct];
      const pick = mode === 'correct' ? right : question.options.find(o => o !== right)!;
      await page.getByRole('radio', { name: pick, exact: true }).click();
    } else if ((await radios.count()) > 0) {
      await radios.first().click();
    }

    await page.getByRole('button', { name: 'Проверить' }).click();
    // The feedback panel is announced politely to screen readers.
    const feedback = page.locator('[aria-live="polite"]').filter({ visible: true });
    await expect(feedback).toHaveCount(1);
    const isCorrect = (await feedback.getByText('Не совсем', { exact: true }).count()) === 0;
    if (question && mode === 'wrong') expect(isCorrect, `question ${question.id}`).toBe(false);
    if (isCorrect) correct++;

    const isLast = i === total - 1;
    await page.getByRole('button', { name: isLast ? 'Завершить' : 'Дальше' }).click();
  }
  return correct;
}

/** From a lesson result screen back to home (next lesson → close). */
export async function leaveLessonResult(page: Page) {
  await page.getByRole('button', { name: /^Дальше: / }).click();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(startLessonButton(page)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
}

export function xpChip(page: Page) {
  return page.getByLabel(/^Опыт: \d+ XP$/);
}

export async function readXp(page: Page): Promise<number> {
  const label = await xpChip(page).getAttribute('aria-label');
  return Number(label!.match(/\d+/)![0]);
}
