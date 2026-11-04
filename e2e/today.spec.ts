import {
  answerQuiz,
  completeOnboarding,
  expect,
  leaveLessonResult,
  openNextLesson,
  test,
} from './support';

// Fixed zone, so the clock below is local time wherever the tests run.
test.use({ timezoneId: 'Europe/Moscow' });

test('home moves to the new day at midnight while the app stays open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-05T23:40:00+03:00') });
  await completeOnboarding(page);
  await openNextLesson(page);
  await answerQuiz(page, 'first');
  await leaveLessonResult(page);

  await expect(page.getByText('#5', { exact: true })).toBeVisible();
  await expect(page.getByText(/^стрик 1 день · сегодня засчитан$/)).toBeVisible();
  await expect(page.getByText(/^0\/50 XP$/)).toHaveCount(0);

  // No reload and no trip to the background: only the clock passes midnight.
  await page.clock.fastForward('30:00');
  await expect(page.getByText('#6', { exact: true })).toBeVisible();
  await expect(page.getByText(/^0\/50 XP$/)).toBeVisible();
  await expect(page.getByText('пройди урок, чтобы сохранить стрик (1 день)')).toBeVisible();
});

test('workout explains the review intervals in correct Russian', async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole('tab', { name: /повтор/ }).click();
  await expect(page.getByText(/возвращаются через 2, 4, 8, 16, 32 дня\. ошибки/)).toBeVisible();
});
