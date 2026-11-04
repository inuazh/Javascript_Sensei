/**
 * The page-side half of «Запустить код»: a plain-JS harness that runs a snippet
 * in a fresh JS realm (a hidden WebView page on native; on web, a Worker inside a
 * sandboxed, opaque-origin iframe) and reports what the browser console would show.
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
/** Longest console line, completion value or error message, in UTF-16 units (≈2 KB). */
export const MAX_LINE_LENGTH = 2048;
/** Total length of the console lines kept (≈50 KB); the rest is replaced with `…`. */
export const MAX_OUTPUT_LENGTH = 50_000;
/** Marks cut output. */
export const ELLIPSIS = '…';

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
    if (v instanceof RegExp || tag === 'RegExp') return String(v);
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
 * `clipText(s, max)`: `s` cut to at most `max` characters, ending with `…` when cut.
 * Never splits a surrogate pair. Mirrors clipText() below.
 */
const CLIP_TEXT_JS = String.raw`
function clipText(s, max) {
  s = String(s);
  if (s.length <= max) return s;
  var end = max - 1;
  var c = s.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end--;
  return s.slice(0, end) + '${ELLIPSIS}';
}`;

/**
 * Globals a snippet must not reach: network, storage, and new realms (a nested
 * Worker would come with a fresh, unpatched global object).
 */
const BLOCKED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'WebSocketStream',
  'WebTransport',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'localStorage',
  'sessionStorage',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
  'webkitRTCPeerConnection',
];

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
  ${CLIP_TEXT_JS}

  /**
   * Hides a global from the snippet. Web APIs often live on the prototype of the
   * global object (Object.getPrototypeOf(self).fetch), so they are deleted along
   * the whole chain. The own property stays configurable and writable: snippets
   * may still declare their own fetch.
   */
  function hideGlobal(g, name) {
    for (var o = Object.getPrototypeOf(g); o; o = Object.getPrototypeOf(o)) {
      try {
        if (Object.getOwnPropertyDescriptor(o, name)) delete o[name];
      } catch (e) {}
      try {
        if (Object.getOwnPropertyDescriptor(o, name)) {
          Object.defineProperty(o, name, { value: undefined, configurable: true, writable: true });
        }
      } catch (e) {}
    }
    try { Object.defineProperty(g, name, { value: undefined, configurable: true, writable: true }); } catch (e) {}
  }

  var g = globalThis;
  var realSetTimeout = g.setTimeout;
  var realClearTimeout = g.clearTimeout;
  var realSetInterval = g.setInterval;

  return function run(job, post, execScript) {
    var lines = [];
    var outputLength = 0;
    var full = false;
    var error = null;
    var value;
    var finished = false;
    var main = false;
    var timers = new Map();
    var started = Date.now();
    var idleChecks = 0;

    function log() {
      if (!main || finished || full) return;
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        parts.push(clipText(formatValue(arguments[i]), ${MAX_LINE_LENGTH}));
      }
      var line = clipText(parts.join(' '), ${MAX_LINE_LENGTH});
      if (lines.length >= ${MAX_LINES} || outputLength + line.length > ${MAX_OUTPUT_LENGTH}) {
        lines.push('${ELLIPSIS}');
        full = true;
        return;
      }
      outputLength += line.length;
      lines.push(line);
    }
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (m) { console[m] = log; });

    function fail(e, inPromise) {
      if (!main || finished) return;
      var isError = e !== null && typeof e === 'object' && typeof e.name === 'string';
      error = isError
        ? {
            name: clipText(e.name, ${MAX_LINE_LENGTH}),
            message: clipText(e.message === undefined ? '' : e.message, ${MAX_LINE_LENGTH}),
          }
        : { name: '', message: clipText(formatValue(e), ${MAX_LINE_LENGTH}) };
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
      // No network, storage or nested workers from snippets.
      ${JSON.stringify(BLOCKED_GLOBALS)}.forEach(function (k) { hideGlobal(g, k); });
      try {
        var v = (0, eval)(job.code);
        if (v !== undefined) value = clipText(formatValue(v), ${MAX_LINE_LENGTH});
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
  const csp =
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src 'none'; " +
    "form-action 'none'; base-uri 'none'";
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

/** Tags the messages the sandbox iframe sends to the app (web). */
export const FRAME_MESSAGE_SOURCE = 'js-sensei-runner';

/** What the sandbox iframe posts to the app: the worker's message, or why it failed. */
export type FrameMessage =
  | { source: typeof FRAME_MESSAGE_SOURCE; result: unknown }
  | { source: typeof FRAME_MESSAGE_SOURCE; failed: string };

/**
 * The srcdoc of the sandbox iframe (web). Load it in `<iframe sandbox="allow-scripts">`:
 * the page gets an opaque origin, so neither it nor its Worker can reach the app's
 * origin (storage, cookies, same-origin requests). Its CSP, which the Worker
 * inherits, blocks every request. The page starts a Worker from `workerSource` and
 * relays the Worker's first message to the parent as a FrameMessage, posted to
 * `targetOrigin`. Removing the iframe terminates the Worker, even mid-`while (true)`.
 */
export function buildSandboxFrameHtml(workerSource: string, targetOrigin: string): string {
  const csp =
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob: data:; " +
    "form-action 'none'; base-uri 'none'";
  const source = jsLiteral(FRAME_MESSAGE_SOURCE);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
</head><body><script>
(function () {
  var src = ${jsLiteral(workerSource)};
  var target = ${jsLiteral(targetOrigin)};
  var sent = false;
  function send(msg) {
    if (sent) return;
    sent = true;
    msg.source = ${source};
    parent.postMessage(msg, target);
  }
  var worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  } catch (e) {
    try {
      worker = new Worker('data:text/javascript;charset=utf-8,' + encodeURIComponent(src));
    } catch (e2) {
      return send({ failed: String((e2 && e2.message) || e2) });
    }
  }
  worker.onmessage = function (event) {
    send({ result: event.data });
    worker.terminate();
  };
  worker.onerror = function (event) {
    if (event.preventDefault) event.preventDefault();
    send({ failed: String(event.message || '') });
    worker.terminate();
  };
})();
</script></body></html>`;
}

/**
 * Whether the native runner WebView may load `url`. Only the inline page itself
 * (served as about:blank) and same-document srcdoc frames are allowed; every other
 * navigation is blocked: a snippet must not open sites, and a data: page would
 * load without the runner's CSP.
 */
export function isRunnerNavigationAllowed(url: string): boolean {
  return /^about:(blank|srcdoc)([?#]|$)/.test(url);
}

/**
 * `text` cut to at most `max` characters (UTF-16 units), ending with `…` when
 * cut. Never splits a surrogate pair. Mirrors clipText() in the harness.
 */
export function clipText(text: string, max: number = MAX_LINE_LENGTH): string {
  if (text.length <= max) return text;
  let end = max - 1;
  const c = text.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end--;
  return text.slice(0, end) + ELLIPSIS;
}

/**
 * Console lines within the output limits: each line at most MAX_LINE_LENGTH, at
 * most MAX_LINES lines and MAX_OUTPUT_LENGTH characters in all, then a single `…`.
 * Same rules as the harness, so its output passes through unchanged.
 */
export function limitLines(lines: readonly unknown[]): string[] {
  const kept: string[] = [];
  let length = 0;
  for (const raw of lines.slice(0, MAX_LINES + 1)) {
    const line = clipText(String(raw));
    if (kept.length >= MAX_LINES || length + line.length > MAX_OUTPUT_LENGTH) {
      kept.push(ELLIPSIS);
      break;
    }
    length += line.length;
    kept.push(line);
  }
  return kept;
}

/**
 * Validates a message coming back from the sandbox. The sandbox runs untrusted
 * code, so the output limits are enforced again here.
 */
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
  let error: RunError | null = null;
  if (r.error && typeof r.error === 'object') {
    error = { name: clipText(String(r.error.name)), message: clipText(String(r.error.message)) };
    if (r.error.inPromise === true) error.inPromise = true;
  }
  return {
    lines: limitLines(r.lines),
    error,
    timedOut: r.timedOut === true,
    ...(typeof r.value === 'string' ? { value: clipText(r.value) } : null),
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
