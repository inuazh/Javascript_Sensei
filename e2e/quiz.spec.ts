import type { Locator, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  completeOnboarding,
  expect,
  getLesson,
  openNextLesson,
  test,
  type ContentLesson,
} from './support';

/** The «n/total» counter of the running quiz. */
const counter = (page: Page) =>
  page
    .getByText(/^\d+\/\d+$/)
    .filter({ visible: true })
    .first();

const feedback = (page: Page) => page.locator('[aria-live="polite"]').filter({ visible: true });

/**
 * Two quick taps on the spot where `button` is, like a finger would: the
 * second one lands on whatever the first tap put there. Waits a moment after,
 * so a navigation started by the second tap has happened.
 */
async function doubleTap(page: Page, button: Locator) {
  const box = (await button.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await button.click();
  await page.waitForTimeout(150);
  await page.mouse.click(x, y);
  await page.waitForTimeout(500);
}

/** Id of the last lesson of the course: last section, last topic, last lesson. */
function lastLessonId(): string {
  const dir = path.join(__dirname, '..', 'content');
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
  type Ordered = { id: string; order: number };
  const { sections } = JSON.parse(fs.readFileSync(path.join(dir, 'sections.json'), 'utf8')) as {
    sections: (Ordered & { topics: Ordered[] })[];
  };
  const section = [...sections].sort(byOrder).pop()!;
  const topic = [...section.topics].sort(byOrder).pop()!;
  const { lessons } = JSON.parse(fs.readFileSync(path.join(dir, `${section.id}.json`), 'utf8')) as {
    lessons: (Ordered & { topicId: string })[];
  };
  return lessons
    .filter(l => l.topicId === topic.id)
    .sort(byOrder)
    .pop()!.id;
}

/** Answers every question of `lesson` right, dragging order lines into place. */
async function answerCorrectly(page: Page, lesson: ContentLesson) {
  const total = lesson.questions.length;
  for (let i = 0; i < total; i++) {
    await expect(counter(page)).toHaveText(`${i + 1}/${total}`);
    const question = lesson.questions[i];
    if (question.options && question.correct !== undefined) {
      const right = question.options[question.correct];
      await page.getByRole('radio', { name: right, exact: true }).click();
    } else if (question.lines) {
      const { lines } = question;
      const rows = page.getByLabel(/^строка \d+: /);
      for (let target = 0; target < lines.length; target++) {
        const labels = await rows.evaluateAll(els =>
          els.map(e => e.getAttribute('aria-label') ?? ''),
        );
        const from = labels.findIndex(l => l.endsWith(`: ${lines[target]}`));
        if (from === target) continue;
        const a = (await rows.nth(from).boundingBox())!;
        const b = (await rows.nth(target).boundingBox())!;
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(a.x + a.width / 2, b.y + b.height / 2, { steps: 8 });
        await page.mouse.up();
        await expect(rows.nth(target)).toHaveAccessibleName(
          `строка ${target + 1}: ${lines[target]}`,
        );
      }
    } else {
      throw new Error(`no right answer known for question ${question.id}`);
    }
    await page.getByRole('button', { name: 'проверить' }).click();
    await expect(feedback(page)).toHaveCount(1);
    await expect(feedback(page).getByText('не совсем', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: i === total - 1 ? 'завершить' : 'дальше' }).click();
  }
}

test('a double tap on «проверить» shows the explanation instead of skipping it', async ({
  page,
}) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const total = lesson.questions.length;

  await page.getByRole('radio').first().click();
  await doubleTap(page, page.getByRole('button', { name: 'проверить' }));
  await expect(feedback(page)).toHaveCount(1);
  await expect(counter(page)).toHaveText(`1/${total}`);
  await expect(page.getByRole('button', { name: 'дальше' })).toBeVisible();
});

test('a double tap on «дальше» does not check the next question', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const total = lesson.questions.length;
  // An order question has an answer from the start, so «проверить» is enabled at once.
  const order = lesson.questions.findIndex(q => q.type === 'order');
  expect(order).toBeGreaterThan(0);

  for (let i = 0; i < order; i++) {
    await expect(counter(page)).toHaveText(`${i + 1}/${total}`);
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'проверить' }).click();
    await expect(feedback(page)).toHaveCount(1);
    if (i < order - 1) await page.getByRole('button', { name: 'дальше' }).click();
  }
  await doubleTap(page, page.getByRole('button', { name: 'дальше' }));
  await expect(counter(page)).toHaveText(`${order + 1}/${total}`);
  await expect(page.getByRole('button', { name: 'проверить' })).toBeVisible();
  await expect(feedback(page)).toHaveCount(0);
});

test('a double tap on «завершить» shows the lesson result', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const total = lesson.questions.length;
  for (let i = 0; i < total; i++) {
    await expect(counter(page)).toHaveText(`${i + 1}/${total}`);
    const radios = page.getByRole('radio');
    if ((await radios.count()) > 0) await radios.first().click();
    await page.getByRole('button', { name: 'проверить' }).click();
    await expect(feedback(page)).toHaveCount(1);
    if (i < total - 1) await page.getByRole('button', { name: 'дальше' }).click();
  }
  // The second tap lands where «пройти ещё раз» appears: it must not restart the lesson.
  await doubleTap(page, page.getByRole('button', { name: 'завершить' }));
  await expect(page.getByText(/^(идеально|отлично|урок пройден)$/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^дальше: / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'проверить' })).toHaveCount(0);
});

test('a double tap on «завершить» shows the daily result', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/daily');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'проверить' }).click();
  await expect(feedback(page)).toHaveCount(1);
  // The second tap lands where «готово» appears: it must not close the result.
  await doubleTap(page, page.getByRole('button', { name: 'завершить' }));
  await expect(page.getByText(/^(решено|не в этот раз)$/)).toBeVisible();
  await expect(page).toHaveURL(/\/daily$/);
});

test('the last lesson of the course offers one way home, not two', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = getLesson(lastLessonId());
  await page.goto(`/lesson/${lesson.id}`);
  await page.getByRole('button', { name: /к практике/ }).click();
  await answerCorrectly(page, lesson);

  const total = lesson.questions.length;
  await expect(page.getByText(`${total}/${total}`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^дальше: / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'на главную' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'к карте курса' })).toHaveCount(0);
});
