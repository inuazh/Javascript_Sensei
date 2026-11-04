import {
  answerQuiz,
  completeOnboarding,
  expect,
  getLesson,
  getTopicTitle,
  leaveLessonResult,
  openNextLesson,
  readXp,
  startLessonButton,
  test,
  xpChip,
} from './support';

test('fresh user goes through onboarding to home', async ({ page }) => {
  await completeOnboarding(page, 'Новичок');

  await expect(page).toHaveURL(/\/$/);
  await expect(startLessonButton(page)).toBeVisible();
  await expect(page.getByText('начни отсюда')).toBeVisible();
  await expect(xpChip(page)).toHaveAttribute('aria-label', 'Опыт: 0 XP');

  // Settings are persisted: a reload skips onboarding.
  await page.reload();
  await expect(startLessonButton(page)).toBeVisible();
});

test('lesson: theory, questions, result, progress on home', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);

  const correct = await answerQuiz(page, 'correct', lesson);
  expect(correct).toBeGreaterThan(0);

  await expect(page.getByText(`${correct}/${lesson.questions.length}`)).toBeVisible();
  await expect(page.getByText(/^\+\d+$/).first()).toBeVisible(); // xp earned on the result card
  await leaveLessonResult(page);

  expect(await readXp(page)).toBeGreaterThan(0);
  const topic = getTopicTitle(lesson.topicId);
  await expect(
    page.getByRole('button', { name: new RegExp(`^${topic}, пройдено 1 из \\d+$`) }),
  ).toBeVisible();
  await expect(page.getByText('продолжить')).toBeVisible();
});

test('review: mistakes come back in the workout', async ({ page }) => {
  await completeOnboarding(page);
  const lesson = await openNextLesson(page);
  const correct = await answerQuiz(page, 'wrong', lesson);
  const mistakes = lesson.questions.length - correct;
  expect(mistakes).toBeGreaterThan(0);
  await leaveLessonResult(page);

  await expect(page.getByRole('button', { name: /Пора повторить/ })).toBeVisible();

  // The tab badge counts the questions that are due.
  const reviewTab = page.getByRole('tab', { name: /повтор/ });
  await expect(reviewTab).toHaveAccessibleName(new RegExp(`\\b${mistakes}\\s+повтор`));
  await reviewTab.click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(page.getByText('на сегодня')).toBeVisible();
  await expect(page.getByText(/^вопрос\S* на повторение$/)).toBeVisible();

  await page.getByRole('button', { name: /Начать тренировку/ }).click();
  await expect(page).toHaveURL(/\/review$/);
  await answerQuiz(page, 'first');

  await expect(page.getByText(/^(Тренировка завершена|Всё помнишь)$/)).toBeVisible();
  await page.getByRole('button', { name: /Готово/ }).click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(page.getByText('тренировок')).toBeVisible();
});

test('placement: experienced user can skip the test', async ({ page }) => {
  await completeOnboarding(page, 'Есть опыт');

  await expect(page).toHaveURL(/\/placement$/);
  await expect(page.getByText('Вводный тест')).toBeVisible();
  await expect(page.getByRole('button', { name: /Пройти тест/ })).toBeVisible();

  await page.getByRole('button', { name: 'Начать с первого урока' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(startLessonButton(page)).toBeVisible();
  // Declined placement is remembered, so home does not offer it again.
  await expect(page.getByText('Уже знаешь основы?')).toHaveCount(0);
});

test('persisted v0 state is migrated on load', async ({ page }) => {
  await page.addInitScript(() => {
    const KEY = 'js-sensei-user';
    if (localStorage.getItem(KEY)) return; // seed only before the first load
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 0,
        state: {
          userProgress: {
            totalXp: 5000,
            currentStreak: 7,
            longestStreak: 9,
            lastActiveDate: today,
            dailyGoalMinutes: 10,
          },
          topicsProgress: { variables: { completedLessons: ['variables-01'], bestStars: 3 } },
          lessonResults: [
            {
              lessonId: 'variables-01',
              completedAt: now.toISOString(),
              correctAnswers: 5,
              totalQuestions: 5,
            },
          ],
          isOnboarded: true,
          unlockedAchievements: [],
        },
      }),
    );
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(startLessonButton(page)).toBeVisible();
  await expect(page.getByLabel('Стрик: 7 дней')).toBeVisible();
  await expect(page.getByText('стрик 7 дней · сегодня засчитан')).toBeVisible();
  await expect(page.getByText(/\/100 xp$/)).toBeVisible(); // 10 minutes → 100 XP goal
  expect(await readXp(page)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /^Переменные, пройдено 1 из \d+$/ })).toBeVisible();

  // The migrated state is written back in the current format.
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('js-sensei-user') ?? '{}').version),
    )
    .toBe(1);
});

test('reference: search the theory and open a lesson', async ({ page }) => {
  await completeOnboarding(page);

  await page.getByRole('button', { name: /Справочник/ }).click();
  await expect(page).toHaveURL(/\/reference$/);
  const search = page.getByRole('textbox', { name: 'Поиск по теории' });
  await search.fill('qwertyzzz');
  await expect(page.getByText('Ничего не нашлось')).toBeVisible();

  await search.fill('замыкани');
  await expect(page.getByText(/^найдено: \d+ урок/)).toBeVisible();
  // Lessons titled «Замыкания…» are ranked first.
  const first = page
    .getByRole('button', { name: /^Теория: / })
    .filter({ visible: true })
    .first();
  await expect(first).toHaveAccessibleName(/^Теория: Замыкания/);
  await first.click();

  await expect(page).toHaveURL(/\/reference\/[\w-]+$/);
  const lesson = getLesson(new URL(page.url()).pathname.split('/').pop()!);
  expect(lesson.title).toMatch(/^Замыкания/);
  const visible = (text: string) => page.getByText(text).filter({ visible: true }).first();
  await expect(visible(lesson.title)).toBeVisible();
  const text = lesson.theory!.blocks.find(b => b.type === 'text')!.text!;
  await expect(visible(text.replace(/\*\*|`/g, '').slice(0, 40))).toBeVisible();
  await expect(page.getByRole('button', { name: 'Запустить код' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Пройти урок' }).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${lesson.id}$`));
  await expect(page.getByRole('button', { name: /К практике/ })).toBeVisible();
});
