import {
  answerQuiz,
  completeOnboarding,
  expect,
  openNextLesson,
  startLessonButton,
  test,
} from './support';

test('unknown url shows a Russian not-found screen that leads home', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/no/such/page');
  await expect(page.getByText('Страница не найдена')).toBeVisible();
  await page.getByRole('button', { name: 'На главную' }).click();
  await expect(startLessonButton(page)).toBeVisible();
});

test('screens opened by a deep link close to home', async ({ page }) => {
  await completeOnboarding(page);

  // Nothing to go back to: closing must not leave the user stuck.
  await page.goto('/lesson/variables-01');
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(startLessonButton(page)).toBeVisible();

  await page.goto('/lesson/no-such-lesson');
  await expect(page.getByText('Урок не найден')).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(startLessonButton(page)).toBeVisible();

  await page.goto('/privacy-policy');
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(startLessonButton(page)).toBeVisible();
});

test('leaving a started lesson asks for confirmation', async ({ page }) => {
  await completeOnboarding(page);
  await openNextLesson(page);
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Проверить' }).click();

  const messages: string[] = [];
  page.once('dialog', dialog => {
    messages.push(dialog.message());
    void dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect.poll(() => messages).toEqual([expect.stringMatching(/^Прервать\?/)]);
  await expect(page).toHaveURL(/\/lesson\//); // «Остаться»

  page.once('dialog', dialog => void dialog.accept());
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(startLessonButton(page)).toBeVisible();
});

test('order question: lines can be dragged with a mouse', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const index = lesson.questions.findIndex(q => q.type === 'order');
  expect(index).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < index; i++) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Проверить' }).click();
    await page.getByRole('button', { name: 'Дальше' }).click();
  }

  // Drag the line that belongs first to the top until the order is right.
  const { lines } = lesson.questions[index] as { lines: string[] };
  const rows = page.getByLabel(/^Строка \d+: /);
  await expect(rows).toHaveCount(lines.length);
  for (let target = 0; target < lines.length; target++) {
    const labels = await rows.evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''));
    const from = labels.findIndex(l => l.endsWith(`: ${lines[target]}`));
    if (from === target) continue;
    const a = (await rows.nth(from).boundingBox())!;
    const b = (await rows.nth(target).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(rows.nth(target)).toHaveAccessibleName(`Строка ${target + 1}: ${lines[target]}`);
  }

  await page.getByRole('button', { name: 'Проверить' }).click();
  const feedback = page.locator('[aria-live="polite"]').filter({ visible: true });
  await expect(feedback).toHaveCount(1);
  await expect(feedback.getByText('Не совсем', { exact: true })).toHaveCount(0);
});

test('settings: reset progress after confirmation', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  await answerQuiz(page, 'correct', lesson);
  await page.getByRole('button', { name: /^Дальше: / }).click();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(page.getByText('продолжить')).toBeVisible();

  await page.goto('/settings');
  page.once('dialog', dialog => void dialog.accept());
  await page.getByRole('button', { name: 'Сбросить прогресс' }).click();
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByText('начни отсюда')).toBeVisible();
});
