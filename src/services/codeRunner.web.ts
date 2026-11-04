/**
 * Web version of ./codeRunner.tsx. Each run gets a hidden `<iframe sandbox="allow-scripts">`
 * built from srcdoc, which starts a Worker for the snippet:
 *
 * - the iframe has an opaque origin, so the snippet cannot reach the app's origin
 *   (storage, cookies, same-origin requests) even through APIs the harness misses;
 * - its CSP, inherited by the Worker, blocks network requests;
 * - the snippet runs in the Worker, off the main thread, and removing the iframe
 *   terminates the Worker, so `while (true)` cannot freeze the app.
 *
 * Messages are accepted only from that iframe's window.
 */
import {
  FRAME_MESSAGE_SOURCE,
  TIMED_OUT,
  WATCHDOG_MS,
  buildSandboxFrameHtml,
  buildWorkerSource,
  clipText,
  failedToStart,
  parseRunResult,
  type FrameMessage,
  type RunCode,
  type RunResult,
} from './runnerHarness';

function isFrameMessage(data: unknown): data is FrameMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === FRAME_MESSAGE_SOURCE
  );
}

export const runCode: RunCode = (code, options) =>
  new Promise(resolve => {
    if (typeof document === 'undefined' || !document.body) {
      return resolve(failedToStart('браузер не дал запустить код'));
    }
    const origin = window.location.origin;
    const html = buildSandboxFrameHtml(
      buildWorkerSource({ code, setup: options?.setup }),
      origin && origin !== 'null' ? origin : '*',
    );

    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.tabIndex = -1;
    frame.title = 'code runner';
    frame.style.cssText =
      'position:absolute;left:-10px;top:-10px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';

    let settled = false;
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      window.removeEventListener('message', onMessage);
      frame.remove(); // also terminates the Worker
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (!frame.contentWindow || event.source !== frame.contentWindow) return;
      const data: unknown = event.data;
      if (!isFrameMessage(data)) return;
      if ('failed' in data) {
        finish(failedToStart(clipText(String(data.failed)) || 'не удалось запустить код'));
        return;
      }
      const result = parseRunResult(data.result);
      finish(result ?? failedToStart('не удалось запустить код'));
    };

    window.addEventListener('message', onMessage);
    const watchdog = setTimeout(() => finish(TIMED_OUT), WATCHDOG_MS);
    frame.srcdoc = html;
    try {
      document.body.appendChild(frame);
    } catch {
      finish(failedToStart('браузер не дал запустить код'));
    }
  });

/** Nothing to mount on web. */
export function CodeRunnerHost() {
  return null;
}
