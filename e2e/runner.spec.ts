/**
 * The «Запустить код» sandbox on web: the real button in a lesson, and the
 * sandbox iframe itself, loaded into the app's origin and probed with snippets
 * that try to escape it.
 */
import type { Page } from '@playwright/test';
import { buildSandboxFrameHtml, buildWorkerSource } from '../src/services/runnerHarness';
import { completeOnboarding, expect, test } from './support';

/** Loads a sandbox iframe running `workerSource` into the app page; resolves with its first message. */
function runInFrame(page: Page, workerSource: string): Promise<unknown> {
  const html = buildSandboxFrameHtml(workerSource, new URL(page.url()).origin);
  return page.evaluate(
    srcdoc =>
      new Promise(resolve => {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.id = 'probe-frame';
        const done = (value: unknown) => {
          window.removeEventListener('message', onMessage);
          frame.remove();
          resolve(value);
        };
        const onMessage = (event: MessageEvent) => {
          if (event.source === frame.contentWindow) done(event.data);
        };
        window.addEventListener('message', onMessage);
        setTimeout(() => done('no message'), 8000);
        frame.srcdoc = srcdoc;
        document.body.appendChild(frame);
      }),
    html,
  );
}

/** Runs a snippet through the harness in a sandbox iframe; resolves with the RunResult. */
async function runSnippet(page: Page, code: string) {
  const message = (await runInFrame(page, buildWorkerSource({ code }))) as { result?: unknown };
  return message.result as { lines: string[]; error: { name: string; message: string } | null };
}

test('run code: a theory block prints its console output', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/reference/variables-01');
  await page
    .getByRole('button', { name: 'Запустить код' })
    .filter({ visible: true })
    .first()
    .click();
  // let score = 10; console.log(score); score = 15; console.log(score);
  await expect(page.getByText('› 10', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('› 15', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.locator('iframe[sandbox]')).toHaveCount(0); // removed after the run
});

test.describe('web sandbox', () => {
  let probes: string[];
  test.beforeEach(async ({ page }) => {
    probes = [];
    await page.route('**/__runner_probe*', route => {
      probes.push(route.request().url());
      return route.fulfill({ status: 200, body: 'reached' });
    });
    await page.goto('/');
  });

  test('runs in an opaque origin with a CSP that blocks requests', async ({ page }) => {
    const probe = new URL('/__runner_probe', page.url()).href;
    // A bare worker, without the harness: only the iframe sandbox and its CSP stand in the way.
    const message = await runInFrame(
      page,
      `var f = Object.getPrototypeOf(self).fetch || self.fetch;
       f.call(self, ${JSON.stringify(probe)}).then(
         function (r) { postMessage('reached ' + r.status + ' from ' + self.origin); },
         function (e) { postMessage('blocked from ' + self.origin); });`,
    );
    expect(message).toMatchObject({ result: 'blocked from null' });
    expect(probes).toEqual([]);
  });

  test('the harness hides fetch and indexedDB, also on the prototype', async ({ page }) => {
    const r = await runSnippet(
      page,
      `const p = Object.getPrototypeOf(self);
       console.log(typeof fetch, typeof p.fetch, typeof indexedDB, typeof p.indexedDB);
       p.fetch.call(self, '/__runner_probe');`,
    );
    expect(r.lines).toEqual(['undefined undefined undefined undefined']);
    expect(r.error).toMatchObject({ name: 'TypeError' });
    expect(probes).toEqual([]);
  });

  test('snippets cannot start nested workers', async ({ page }) => {
    const r = await runSnippet(
      page,
      `console.log(typeof Worker, typeof SharedWorker);
       new Worker(URL.createObjectURL(new Blob(['fetch("/__runner_probe")'])));`,
    );
    expect(r.lines).toEqual(['undefined undefined']);
    expect(r.error).toMatchObject({ name: 'TypeError' });
    expect(probes).toEqual([]);
  });

  test('removing the iframe stops an endless loop', async ({ page }) => {
    const html = buildSandboxFrameHtml(
      buildWorkerSource({ code: 'while (true) {}' }),
      new URL(page.url()).origin,
    );
    const started = page.waitForEvent('worker');
    await page.evaluate(srcdoc => {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.id = 'loop-frame';
      frame.srcdoc = srcdoc;
      document.body.appendChild(frame);
    }, html);
    const worker = await started;
    const closed = new Promise(resolve => worker.once('close', resolve));
    await page.evaluate(() => document.getElementById('loop-frame')!.remove());
    await closed;
    // The page itself stays responsive.
    expect(await page.evaluate(() => 1 + 1)).toBe(2);
  });
});
