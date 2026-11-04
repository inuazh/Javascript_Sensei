/**
 * The page-side half of «Запустить код»: a plain-JS harness that runs a snippet
 * in a fresh JS realm (a hidden WebView page on native, a Worker on web) and
 * reports what the browser console would show.
 *
 * The harness ships as source text because it runs in another JS engine. Keep
 * this file free of React Native imports: the content validator and the tests
 * load it in Node.
 */

/** Total time a snippet may run, timers included. */
export const RUN_TIMEOUT_MS = 3000;
/** Host-side limit: covers page start-up and snippets that never yield (`while (true)`). */
export const WATCHDOG_MS = RUN_TIMEOUT_MS + 3000;
/** Console lines kept; the rest is replaced with a single `…`. */
export const MAX_LINES = 200;

export interface RunError {
  /** 'TypeError', 'ReferenceError', ... Empty when a non-error value was thrown. */
  name: string;
  message: string;
  /** Came from an unhandled promise rejection. */
  inPromise?: boolean;
}

export interface RunResult {
  /** Console output, one entry per console.log/info/warn/error call. */
  lines: string[];
  /** The first uncaught error. Execution stops there, as in the content validator. */
  error: RunError | null;
  /** Stopped after RUN_TIMEOUT_MS with timers still pending, or never yielded. */
  timedOut: boolean;
  /** Completion value of the script, formatted, when it is not undefined (`2 + 2` → '4'). */
  value?: string;
}

export interface RunJob {
  code: string;
  /**
   * Scripts run before `code` in the same global scope with the console muted
   * and errors ignored: earlier code blocks of the same theory card.
   */
  setup?: string[];
  timeoutMs?: number;
}

/**
 * `formatValue(v, nested, seen)`: a value the way the browser console prints it
 * in lesson options. Strings are unquoted at the top level, arrays are `[1, 2]`,
 * objects `{ a: 1 }`. Shared with the content validator (scripts/lib/run-snippet.ts).
 */
export const FORMAT_VALUE_JS = String.raw`
function formatValue(v, nested, seen) {
  seen = seen || new Set();
  if (typeof v === 'string') return nested ? JSON.stringify(v) : v;
  if (typeof v === 'bigint') return v + 'n';
  if (typeof v === 'symbol') return v.toString();
  if (typeof v === 'function') return v.name ? '[Function: ' + v.name + ']' : '[Function (anonymous)]';
  if (v === null || typeof v !== 'object') return String(v);
  if (seen.has(v)) return '[Circular]';
  seen.add(v);
  var fmt = function (x) { return formatValue(x, true, seen); };
  try {
    if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
    var tag = Object.prototype.toString.call(v).slice(8, -1);
    if (v instanceof Map || tag === 'Map') {
      var entries = [];
      v.forEach(function (x, k) { entries.push(fmt(k) + ' => ' + fmt(x)); });
      return 'Map(' + v.size + ') {' + entries.join(', ') + '}';
    }
    if (v instanceof Set || tag === 'Set') {
      var items = [];
      v.forEach(function (x) { items.push(fmt(x)); });
      return 'Set(' + v.size + ') {' + items.join(', ') + '}';
    }
    if (tag === 'Error') return v.name + ': ' + v.message;
    if (tag === 'Promise') return 'Promise';
    if (tag === 'Date') return v.toISOString();
    var keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    var props = keys.map(function (k) {
      return (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + fmt(v[k]);
    });
    return '{ ' + props.join(', ') + ' }';
  } finally {
    seen.delete(v);
  }
}`;

/**
 * Defines `__jsSenseiRun(job, post, execScript)` on the global object.
 *
 * - `post(result)` receives a RunResult once.
 * - `execScript(src)` runs a classic script in the global scope (setup only).
 *
 * Console methods are captured; timers are tracked so the run ends when none
 * are pending and microtasks have settled, or after `job.timeoutMs`. The first
 * uncaught error (sync, in a timer, or an unhandled rejection) ends the run.
 */
export const HARNESS_JS = String.raw`
var __jsSenseiRun = (function () {
  ${FORMAT_VALUE_JS}

  var g = globalThis;
  var realSetTimeout = g.setTimeout;
  var realClearTimeout = g.clearTimeout;
  var realSetInterval = g.setInterval;

  return function run(job, post, execScript) {
    var lines = [];
    var error = null;
    var value;
    var finished = false;
    var main = false;
    var timers = new Map();
    var started = Date.now();
    var idleChecks = 0;

    function log() {
      if (!main || finished) return;
      if (lines.length === ${MAX_LINES}) lines.push('…');
      if (lines.length > ${MAX_LINES}) return;
      var parts = [];
      for (var i = 0; i < arguments.length; i++) parts.push(formatValue(arguments[i]));
      lines.push(parts.join(' '));
    }
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (m) { console[m] = log; });

    function fail(e, inPromise) {
      if (!main || finished) return;
      var isError = e !== null && typeof e === 'object' && typeof e.name === 'string';
      error = isError
        ? { name: e.name, message: String(e.message === undefined ? '' : e.message) }
        : { name: '', message: formatValue(e) };
      if (inPromise) error.inPromise = true;
      finish(false);
    }

    function clearTimers() {
      timers.forEach(function (_, id) { realClearTimeout(id); });
      timers.clear();
    }

    function finish(timedOut) {
      if (finished) return;
      finished = true;
      clearTimers();
      var result = { lines: lines, error: error, timedOut: timedOut };
      if (value !== undefined) result.value = value;
      post(result);
    }

    function call(fn, args) {
      if (finished) return;
      try {
        if (typeof fn === 'function') fn.apply(undefined, args);
        else (0, eval)(String(fn));
      } catch (e) {
        fail(e);
      }
    }

    function track(repeat) {
      return function (fn, ms) {
        var args = Array.prototype.slice.call(arguments, 2);
        var id;
        var tick = function () {
          if (!repeat) timers.delete(id);
          call(fn, args);
        };
        id = (repeat ? realSetInterval : realSetTimeout)(tick, ms);
        timers.set(id, true);
        return id;
      };
    }
    function untrack(id) {
      if (timers.delete(id)) realClearTimeout(id);
    }
    g.setTimeout = track(false);
    g.setInterval = track(true);
    g.clearTimeout = untrack;
    g.clearInterval = untrack;

    if (g.addEventListener) {
      g.addEventListener('error', function (ev) {
        fail(ev.error !== undefined ? ev.error : { name: 'Error', message: ev.message });
        if (ev.preventDefault) ev.preventDefault();
      });
      g.addEventListener('unhandledrejection', function (ev) {
        fail(ev.reason, true);
        if (ev.preventDefault) ev.preventDefault();
      });
    }

    function check() {
      if (finished) return;
      if (Date.now() - started > (job.timeoutMs || ${RUN_TIMEOUT_MS})) return finish(true);
      // Two idle checks in a row: microtasks and rejection events have been delivered.
      idleChecks = timers.size === 0 ? idleChecks + 1 : 0;
      if (idleChecks >= 2) return finish(false);
      realSetTimeout(check, 10);
    }

    function start() {
      clearTimers(); // timers of setup scripts never run
      main = true;
      started = Date.now();
      // No network or storage from snippets.
      ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'localStorage', 'sessionStorage'].forEach(function (k) {
        try { Object.defineProperty(g, k, { value: undefined, configurable: true, writable: true }); } catch (e) {}
      });
      try {
        var v = (0, eval)(job.code);
        if (v !== undefined) value = formatValue(v);
      } catch (e) {
        fail(e);
      }
      realSetTimeout(check, 0);
    }

    var setup = job.setup || [];
    if (setup.length === 0) return start();
    setup.forEach(function (src) {
      try { execScript(src); } catch (e) {}
    });
    realSetTimeout(start, 0); // lets microtasks of the setup scripts run, muted
  };
})();
`;

/** Makes a value safe to embed as a JS literal inside an inline <script>. */
function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Script for a WebView page: setup runs as separate <script> elements. */
const DOM_EXEC_JS = `function (src) {
  var s = document.createElement('script');
  s.text = src;
  document.head.appendChild(s);
  s.remove();
}`;

/** Script for a Worker: setup runs via importScripts of a blob URL. */
const WORKER_EXEC_JS = `function (src) {
  var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  try { importScripts(url); } finally { URL.revokeObjectURL(url); }
}`;

/** A complete HTML page for react-native-webview. Posts the RunResult as JSON. */
export function buildRunnerHtml(job: RunJob): string {
  const csp = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'";
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
</head><body><script>
var __post = window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
${HARNESS_JS}
__jsSenseiRun(${jsLiteral(job)}, function (r) { __post(JSON.stringify(r)); }, ${DOM_EXEC_JS});
</script></body></html>`;
}

/** Source of a Worker (web). Posts the RunResult as a structured-clone message. */
export function buildWorkerSource(job: RunJob): string {
  return `var __post = self.postMessage.bind(self);
${HARNESS_JS}
__jsSenseiRun(${jsLiteral(job)}, function (r) { __post(r); }, ${WORKER_EXEC_JS});
`;
}

/** Validates a message coming back from the sandbox. */
export function parseRunResult(data: unknown): RunResult | null {
  let value = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const r = value as Partial<RunResult> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.lines)) return null;
  return {
    lines: r.lines.map(String),
    error: r.error
      ? { ...r.error, name: String(r.error.name), message: String(r.error.message) }
      : null,
    timedOut: !!r.timedOut,
    ...(typeof r.value === 'string' ? { value: r.value } : null),
  };
}

export const TIMED_OUT: RunResult = { lines: [], error: null, timedOut: true };

export function failedToStart(message: string): RunResult {
  return { lines: [], error: { name: 'Error', message }, timedOut: false };
}

/** `Uncaught TypeError: x is not a function`, like the browser console. */
export function describeError(error: RunError): string {
  const prefix = error.inPromise ? 'Uncaught (in promise)' : 'Uncaught';
  const body =
    error.name && error.message ? `${error.name}: ${error.message}` : error.name || error.message;
  return `${prefix} ${body}`;
}

export type RunCode = (code: string, options?: { setup?: string[] }) => Promise<RunResult>;

/**
 * Runs a theory code block. Some blocks continue an earlier one (`rabbit` was
 * declared two blocks above), so a ReferenceError is retried with the earlier
 * blocks of the card as setup. Blocks that mention ReferenceError on purpose
 * are left alone.
 */
export async function runInContext(
  run: RunCode,
  code: string,
  earlier: readonly string[],
): Promise<RunResult> {
  const alone = await run(code);
  if (alone.error?.name !== 'ReferenceError' || earlier.length === 0) return alone;
  if (code.includes('ReferenceError')) return alone;
  const withContext = await run(code, { setup: [...earlier] });
  return withContext.error?.name === 'ReferenceError' || withContext.timedOut ? alone : withContext;
}
