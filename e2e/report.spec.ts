import { completeOnboarding, expect, openNextLesson, test } from './support';

test('«ошибка в задании?» opens a prefilled letter to support', async ({ page }) => {
  // On the web the mail link goes to window.open; record it instead of opening.
  await page.addInitScript(() => {
    const opened: string[] = ((window as { __opened?: string[] }).__opened = []);
    window.open = (url?: string | URL) => {
      opened.push(String(url));
      return null;
    };
  });
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const question = lesson.questions[0];

  const report = page.getByRole('button', { name: 'сообщить об ошибке в задании' });
  await expect(report).toHaveCount(0); // only after the answer is checked
  const radios = page.getByRole('radio');
  if ((await radios.count()) > 0) await radios.first().click();
  await page.getByRole('button', { name: 'проверить' }).click();
  await report.click();

  const opened = await page.evaluate(() => (window as { __opened?: string[] }).__opened ?? []);
  expect(opened).toHaveLength(1);
  const url = new URL(opened[0]);
  expect(url.protocol).toBe('mailto:');
  expect(url.pathname).toBe('jssensei.app@gmail.com');
  expect(url.searchParams.get('subject')).toBe(`ошибка в задании ${question.id}`);
  const body = url.searchParams.get('body')!;
  expect(body).toContain(`вопрос: ${question.id}`);
  expect(body).toContain(`урок: ${lesson.id}`);
  expect(body).toMatch(/версия приложения: \d+\.\d+\.\d+/);
  expect(body).toMatch(/мой ответ:\s*\S/);
});
