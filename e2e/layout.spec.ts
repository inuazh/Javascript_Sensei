import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from './support';

/** Narrow phones: 320px is the smallest width the layout has to hold. */
test.use({ viewport: { width: 320, height: 568 } });

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const LESSON_IDS: { id: string; topicId: string }[] = fs
  .readdirSync(CONTENT_DIR)
  .filter(f => f.endsWith('.json') && f !== 'sections.json')
  .flatMap(f => JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')).lessons);

/** A learner who has been at it for a year: big numbers everywhere. */
async function seedVeteran(page: Page) {
  await page.addInitScript(
    ids => {
      const KEY = 'js-sensei-user';
      if (localStorage.getItem(KEY)) return; // seed only before the first load
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const iso = now.toISOString();
      const lessons = Object.fromEntries(
        ids.map(id => [
          id,
          {
            bestCorrect: 5,
            total: 5,
            stars: 3,
            attempts: 2,
            firstCompletedAt: iso,
            lastCompletedAt: iso,
          },
        ]),
      );
      localStorage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          state: {
            // A nickname from an older version, before the emoji-free rules.
            settings: {
              onboarded: true,
              placementDone: true,
              dailyGoalXp: 150,
              nickname: '😀 ник',
              reminder: { enabled: true, hour: 19, minute: 0 },
            },
            progress: {
              totalXp: 48250,
              lessons,
              activity: { [today]: { xp: 140, lessons: 2, reviews: 0 } },
              streak: { current: 365, longest: 412, lastActiveDay: today, freezes: 2 },
            },
          },
        }),
      );
    },
    LESSON_IDS.slice(0, 150).map(l => l.id),
  );
}

/** Texts whose longest word does not fit their box, i.e. are broken in the middle of a word. */
function brokenWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const broken: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('div[dir="auto"], span')) {
      if (el.children.length > 0 || !el.checkVisibility({ visibilityProperty: true })) continue;
      const style = getComputedStyle(el);
      if (style.textOverflow === 'ellipsis') continue; // cut on purpose (numberOfLines)
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const spacing = parseFloat(style.letterSpacing) || 0;
      const box = el.getBoundingClientRect().width;
      const word = (el.textContent ?? '')
        .split(/\s+/)
        .find(w => ctx.measureText(w).width + spacing * w.length > box + 1);
      if (word) broken.push(word);
    }
    return broken;
  });
}

test('big numbers and an emoji nickname fit a 320px screen', async ({ page }) => {
  await seedVeteran(page);
  await page.goto('/');

  // The header chips stay on screen.
  const xp = page.getByLabel('опыт: 48250 XP');
  await expect(xp).toBeVisible();
  const chip = (await xp.boundingBox())!;
  expect(chip.x + chip.width).toBeLessThanOrEqual(320);
  // «140/150 XP» stays on one line.
  const goal = (await page.getByText(/^140\/150 XP$/).boundingBox())!;
  expect(goal.height).toBeLessThan(45);

  await page.getByRole('tab', { name: /профиль/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  // The avatar shows the whole emoji, not half of its surrogate pair.
  await expect(page.getByText('😀', { exact: true })).toBeVisible();
  for (const value of ['365', '412', '150']) {
    const box = (await page.getByText(value, { exact: true }).first().boundingBox())!;
    expect(box.height, `stat ${value} on one line`).toBeLessThan(40);
  }
  // Two achievement tiles per row fill the row on a narrow screen.
  const first = (await page.getByLabel(/^первый шаг:/).boundingBox())!;
  const second = (await page.getByLabel(/^без ошибок:/).boundingBox())!;
  expect(second.y).toBe(first.y);
  expect(second.x + second.width).toBeGreaterThan(320 - 20 - 2);
  expect(await brokenWords(page)).toEqual([]);
});

test('achievements fill three columns on a 360px screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await seedVeteran(page);
  await page.goto('/profile');
  const boxes = await Promise.all(
    [/^первый шаг:/, /^без ошибок:/, /^втянулся:/].map(
      async name => (await page.getByLabel(name).boundingBox())!,
    ),
  );
  expect(boxes.map(b => b.y)).toEqual([boxes[0].y, boxes[0].y, boxes[0].y]);
});

test('lesson titles of a finished topic are not broken mid-word at 320px', async ({ page }) => {
  await seedVeteran(page);
  for (const topicId of ['destructuring', 'async-await', 'error-types']) {
    await page.goto(`/topic/${topicId}`);
    await expect(page.getByRole('button', { name: 'назад' })).toBeVisible();
    expect(await brokenWords(page), topicId).toEqual([]);
  }
});

test('the reminder time in onboarding stays on one line', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 640 });
    await page.goto('/');
    await page.getByRole('button', { name: 'начать', exact: true }).click();
    await page.getByRole('button', { name: 'дальше' }).click();
    await page.getByRole('button', { name: 'дальше' }).click();
    const time = page.getByLabel('время 19:00');
    await expect(time).toBeVisible();
    expect((await time.boundingBox())!.height, `at ${width}px`).toBeLessThan(70);
    const later = (await page.getByRole('button', { name: 'позже' }).boundingBox())!;
    expect(later.x + later.width).toBeLessThanOrEqual(width - 20);
    await page.evaluate(() => localStorage.clear());
  }
});
