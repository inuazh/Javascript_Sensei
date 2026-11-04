/**
 * Web version of ./codeRunner.tsx: each run gets its own Worker, which has no
 * access to the page and is terminated when it finishes or hangs.
 */
import {
  TIMED_OUT,
  WATCHDOG_MS,
  buildWorkerSource,
  failedToStart,
  parseRunResult,
  type RunCode,
  type RunResult,
} from './runnerHarness';

export const runCode: RunCode = (code, options) =>
  new Promise(resolve => {
    let worker: Worker;
    const url = URL.createObjectURL(
      new Blob([buildWorkerSource({ code, setup: options?.setup })], { type: 'text/javascript' }),
    );
    try {
      worker = new Worker(url);
    } catch {
      URL.revokeObjectURL(url);
      return resolve(failedToStart('Браузер не дал запустить код'));
    }
    const finish = (result: RunResult) => {
      clearTimeout(watchdog);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const watchdog = setTimeout(() => finish(TIMED_OUT), WATCHDOG_MS);
    worker.onmessage = event => {
      const result = parseRunResult(event.data);
      if (result) finish(result);
    };
    worker.onerror = event => {
      event.preventDefault();
      finish(failedToStart(event.message || 'Не удалось запустить код'));
    };
  });

/** Nothing to mount on web. */
export function CodeRunnerHost() {
  return null;
}
