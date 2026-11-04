import { completeOnboarding, expect, openNextLesson, startLessonButton, test } from './support';
import type { Page } from '@playwright/test';

/** The «n/total» counter of the running quiz. */
const counter = (page: Page) =>
  page
    .getByText(/^\d+\/\d+$/)
    .filter({ visible: true })
    .first();

/** Picks the first option (order questions are checked as shown) and checks. */
async function answerCurrent(page: Page) {
  const radios = page.getByRole('radio');
  if ((await radios.count()) > 0) await radios.first().click();
  await page.getByRole('button', { name: 'проверить' }).click();
  await expect(page.locator('[aria-live="polite"]').filter({ visible: true })).toHaveCount(1);
}

test('an unfinished lesson continues after a reload at the next question', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const total = lesson.questions.length;
  expect(total).toBeGreaterThan(3);

  await expect(counter(page)).toHaveText(`1/${total}`);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'дальше' }).click();
  await expect(counter(page)).toHaveText(`2/${total}`);
  await answerCurrent(page);

  // The second answer is checked; a reload lands on the third question, not the theory.
  await page.reload();
  await expect(counter(page)).toHaveText(`3/${total}`);
  await expect(page.getByRole('button', { name: /к практике/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'проверить' })).toBeVisible();

  // The resumed session goes on to the result with all answers counted.
  for (let i = 3; i <= total; i++) {
    await expect(counter(page)).toHaveText(`${i}/${total}`);
    await answerCurrent(page);
    await page.getByRole('button', { name: i === total ? 'завершить' : 'дальше' }).click();
  }
  await expect(page.getByText(new RegExp(`^\\d+/${total}$`))).toBeVisible();

  // Finished: opening the lesson again starts from the theory.
  await page.goto(`/lesson/${lesson.id}`);
  await expect(page.getByRole('button', { name: /к практике/ })).toBeVisible();
});

test('leaving a lesson with confirmation forgets the unfinished session', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'дальше' }).click();

  page.once('dialog', dialog => void dialog.accept());
  await page.getByRole('button', { name: 'закрыть' }).click();
  await expect(startLessonButton(page)).toBeVisible();

  await page.goto(`/lesson/${lesson.id}`);
  await expect(page.getByRole('button', { name: /к практике/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /к практике/ })).toBeVisible();
});
