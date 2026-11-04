/**
 * Runs a JS snippet in an isolated vm context, roughly the way a browser would:
 * console output is captured, timers run on a fake clock in delay order and
 * promise callbacks are drained between them.
 */
import vm from 'node:vm';

const RUN_TIMEOUT_MS = 2000;

export interface RunResult {
  lines: string[];
  /** Name of the first uncaught error ('TypeError', ...), 'Timeout', or null. */
  error: string | null;
}

/** Formats a value roughly like the browser console, in the style used by lesson options. */
export function formatValue(v: unknown, nested = false, seen = new Set<object>()): string {
  if (typeof v === 'string') return nested ? JSON.stringify(v) : v;
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'symbol') return v.toString();
  if (typeof v === 'function') return v.name ? `[Function: ${v.name}]` : '[Function (anonymous)]';
  if (v === null || typeof v !== 'object') return String(v);
  if (seen.has(v)) return '[Circular]';
  seen.add(v);
  const fmt = (x: unknown) => formatValue(x, true, seen);
  try {
    if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`;
    const tag = Object.prototype.toString.call(v).slice(8, -1);
    if (v instanceof Map || tag === 'Map') {
      const m = v as Map<unknown, unknown>;
      return `Map(${m.size}) {${[...m].map(([k, x]) => `${fmt(k)} => ${fmt(x)}`).join(', ')}}`;
    }
    if (v instanceof Set || tag === 'Set') {
      const s = v as Set<unknown>;
      return `Set(${s.size}) {${[...s].map(fmt).join(', ')}}`;
    }
    if (tag === 'Error') {
      const e = v as Error;
      return `${e.name}: ${e.message}`;
    }
    if (tag === 'Promise') return 'Promise';
    if (tag === 'Date') return (v as Date).toISOString();
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const rec = v as Record<string, unknown>;
    const props = keys.map(
      k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${fmt(rec[k])}`,
    );
    return `{ ${props.join(', ')} }`;
  } finally {
    seen.delete(v);
  }
}

const flushMicrotasks = () => new Promise<void>(resolve => setImmediate(resolve));

export async function runSnippet(code: string): Promise<RunResult> {
  const lines: string[] = [];
  let uncaught: string | null = null;
  const record = (e: unknown) => {
    if (!uncaught) uncaught = (e as Error | undefined)?.name || 'Error';
  };
  const log = (...args: unknown[]) => lines.push(args.map(a => formatValue(a)).join(' '));

  type Timer = { fn: (...a: unknown[]) => void; args: unknown[]; at: number; seq: number };
  const timers = new Map<number, Timer>();
  let nextTimer = 1;

  const ctx = vm.createContext({
    console: { log, info: log, warn: log, error: log, debug: log },
    setTimeout: (fn: Timer['fn'], ms = 0, ...args: unknown[]) => {
      const timerId = nextTimer++;
      timers.set(timerId, { fn, args, at: Number(ms) || 0, seq: timerId });
      return timerId;
    },
    clearTimeout: (timerId: number) => timers.delete(timerId),
    setInterval: () => {
      throw new Error('setInterval is not supported by the validator');
    },
    queueMicrotask: (fn: () => void) => Promise.resolve().then(fn),
  });

  // Unhandled rejections from the snippet are reported, not fatal.
  const onRejection = (e: unknown) => record(e);
  process.on('unhandledRejection', onRejection);
  try {
    try {
      vm.runInContext(code, ctx, { timeout: RUN_TIMEOUT_MS, filename: 'snippet.js' });
    } catch (e) {
      record(e);
    }
    await flushMicrotasks();
    const deadline = Date.now() + RUN_TIMEOUT_MS;
    while (timers.size > 0 && !uncaught) {
      if (Date.now() > deadline) {
        uncaught = 'Timeout';
        break;
      }
      const [timerId, timer] = [...timers].sort(
        (a, b) => a[1].at - b[1].at || a[1].seq - b[1].seq,
      )[0];
      timers.delete(timerId);
      try {
        timer.fn(...timer.args);
      } catch (e) {
        record(e);
      }
      await flushMicrotasks();
    }
    await flushMicrotasks();
  } finally {
    process.off('unhandledRejection', onRejection);
  }
  return { lines, error: uncaught };
}

/** Normalisation applied to both program output and options before comparing. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/'/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/([[{(]) /g, '$1')
    .replace(/ ([\]})])/g, '$1')
    .replace(/ ?, ?/g, ', ')
    .trim();
}

/** All textual renderings of a run that an option may legitimately use. */
export function candidateAnswers({ lines, error }: RunResult): Set<string> {
  const out: string[] = [];
  const joins = [' ', ', ', '\n'];
  if (!error) {
    if (lines.length === 0) out.push('Ничего', 'Ничего не выведет', '(ничего)');
    for (const j of joins) out.push(lines.join(j));
  } else {
    const names = [error, 'Error', 'Ошибка', `Вызовет ${error}`, 'Вызовет ошибку', 'Вызовет Error'];
    for (const name of names) {
      if (lines.length === 0) out.push(name);
      for (const j of joins) out.push([...lines, name].join(j));
    }
  }
  return new Set(out.map(normalizeOutput));
}
