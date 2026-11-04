import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end UI tests against the exported web build of the app.
 * `npm run test:e2e` builds dist-e2e and runs them on a mobile viewport.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${PORT}`;
// Optional override for a preinstalled Chromium whose version differs from @playwright/test.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `node e2e/serve.js dist-e2e ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
