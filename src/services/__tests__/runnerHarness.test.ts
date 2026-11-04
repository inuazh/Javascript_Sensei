import vm from 'node:vm';
import {
  ELLIPSIS,
  FRAME_MESSAGE_SOURCE,
  HARNESS_JS,
  MAX_LINES,
  MAX_LINE_LENGTH,
  MAX_OUTPUT_LENGTH,
  buildRunnerHtml,
  buildSandboxFrameHtml,
  buildWorkerSource,
  clipText,
  describeError,
  isRunnerNavigationAllowed,
  limitLines,
  parseRunResult,
  runInContext,
  type RunCode,
  type RunJob,
  type RunResult,
} from '../runnerHarness';

/**
 * Runs the harness in a fresh Node realm, the way the WebView page / Worker does.
 * `prelude` runs first, e.g. to put browser APIs on the global object's prototype.
 */
function run(code: string, extra: Partial<RunJob> = {}, prelude = ''): Promise<RunResult> {
  return new Promise(resolve => {
    const timers = { setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask };
    const ctx = vm.createContext({ console: {}, ...timers });
    if (prelude) vm.runInContext(prelude, ctx);
    vm.runInContext(HARNESS_JS, ctx);
    ctx.__job = { code, ...extra };
    ctx.__post = resolve;
    ctx.__exec = (src: string) => vm.runInContext(src, ctx);
    vm.runInContext('__jsSenseiRun(__job, __post, __exec)', ctx);
  });
}

describe('code runner harness', () => {
  it('formats values like the browser console', async () => {
    const r = await run(
      'console.log("a", 1, [1, "b"], { a: 1, "b-c": [2] }, new Map([[1, "x"]]), new Set([1]), null, undefined)',
    );
    expect(r).toEqual({
      lines: ['a 1 [1, "b"] { a: 1, "b-c": [2] } Map(1) {1 => "x"} Set(1) {1} null undefined'],
      error: null,
      timedOut: false,
    });
  });

  it('captures every console method, nested objects and errors as values', async () => {
    const r = await run(
      'const o = { n: { m: [] } }; o.self = o; console.info(o); console.warn(new RangeError("x")); console.error(() => 1, function f() {})',
    );
    expect(r.lines).toEqual([
      '{ n: { m: [] }, self: [Circular] }',
      'RangeError: x',
      '[Function (anonymous)] [Function: f]',
    ]);
  });

  it('waits for timers and microtasks in event-loop order', async () => {
    const r = await run(`
      setTimeout(() => console.log("E"), 0);
      Promise.resolve().then(() => console.log("C"));
      const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
      (async () => { console.log("B"); console.log(await wait(30, "F")); })();
      console.log("A");
      queueMicrotask(() => console.log("D"));
    `);
    expect(r.lines).toEqual(['B', 'A', 'C', 'D', 'E', 'F']);
    expect(r.error).toBeNull();
  });

  it('stops at an uncaught error and keeps the output before it', async () => {
    const r = await run('console.log(1); null.x; console.log(2);');
    expect(r.lines).toEqual(['1']);
    expect(r.error).toMatchObject({ name: 'TypeError' });
    expect(r.error?.message).toMatch(/null/);
  });

  it('reports errors thrown in timers and non-error throws', async () => {
    const timer = await run('setTimeout(() => { throw new RangeError("boom") }); console.log("a")');
    expect(timer).toMatchObject({ lines: ['a'], error: { name: 'RangeError', message: 'boom' } });
    const thrown = await run('throw "oops"');
    expect(thrown.error).toEqual({ name: '', message: 'oops' });
  });

  it('reports syntax errors', async () => {
    const r = await run('let x = 1;\nlet x = 2;');
    expect(r).toMatchObject({ lines: [], error: { name: 'SyntaxError' } });
  });

  it('gives up after the timeout when timers keep running', async () => {
    const r = await run('let n = 0; setInterval(() => n++ < 2 && console.log(n), 5)', {
      timeoutMs: 150,
    });
    expect(r).toMatchObject({ lines: ['1', '2'], error: null, timedOut: true });
  });

  it('stops a cleared interval without waiting for the timeout', async () => {
    const r = await run(
      'let n = 0; const id = setInterval(() => { console.log(++n); if (n === 2) clearInterval(id) }, 5)',
      { timeoutMs: 2000 },
    );
    expect(r).toMatchObject({ lines: ['1', '2'], timedOut: false });
  });

  it('returns the completion value of an expression', async () => {
    expect(await run('typeof null === "object"')).toMatchObject({ lines: [], value: 'true' });
    expect((await run('let a = 1;')).value).toBeUndefined();
  });

  it('runs setup scripts muted in the same global scope', async () => {
    const r = await run('console.log(new User("Аня").name, x)', {
      setup: [
        'class User { constructor(n) { this.name = n } }',
        'const x = 2; console.log("muted"); setTimeout(() => console.log("muted too"))',
        'throw new Error("ignored")',
      ],
    });
    expect(r).toEqual({ lines: ['Аня 2'], error: null, timedOut: false });
  });

  it('caps the number of lines', async () => {
    const r = await run('for (let i = 0; i < 500; i++) console.log(i)');
    expect(r.lines).toHaveLength(201);
    expect(r.lines[200]).toBe('…');
  });

  it('cuts long lines, values and error messages', async () => {
    const r = await run('console.log("a".repeat(5000), "b"); "c".repeat(5000)');
    expect(r.lines).toEqual(['a'.repeat(MAX_LINE_LENGTH - 1) + ELLIPSIS]);
    expect(r.value).toBe('c'.repeat(MAX_LINE_LENGTH - 1) + ELLIPSIS);
    const thrown = await run('throw new Error("x".repeat(1e5))');
    expect(thrown.error?.message).toHaveLength(MAX_LINE_LENGTH);
    expect(thrown.error?.message.endsWith(ELLIPSIS)).toBe(true);
  });

  it('caps the total output size', async () => {
    const r = await run('for (let i = 0; i < 100; i++) console.log("x".repeat(3000))');
    const total = r.lines.reduce((n, line) => n + line.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH + 1);
    expect(r.lines.at(-1)).toBe(ELLIPSIS);
    expect(r.lines).toHaveLength(Math.floor(MAX_OUTPUT_LENGTH / MAX_LINE_LENGTH) + 1);
    // Already within the limits: the app-side check keeps it as is.
    expect(parseRunResult(r)?.lines).toEqual(r.lines);
  });

  it('hides network, storage and worker APIs, also on the prototype of the global', async () => {
    const prelude = `
      var proto = Object.getPrototypeOf(globalThis);
      proto.fetch = function () { return 'network'; };
      Object.defineProperty(proto, 'indexedDB', { get: function () { return {}; }, configurable: true });
      globalThis.Worker = function Worker() {};
      globalThis.SharedWorker = function SharedWorker() {};
    `;
    const r = await run(
      `var p = Object.getPrototypeOf(globalThis);
       console.log(typeof fetch, typeof p.fetch, typeof indexedDB, typeof p.indexedDB);
       console.log(typeof Worker, typeof SharedWorker, typeof XMLHttpRequest);`,
      {},
      prelude,
    );
    expect(r.lines).toEqual([
      'undefined undefined undefined undefined',
      'undefined undefined undefined',
    ]);
  });

  it('still lets snippets declare their own fetch', async () => {
    const r = await run('function fetch(u) { return "mock " + u } console.log(fetch("/api"))');
    expect(r).toMatchObject({ lines: ['mock /api'], error: null });
    const lexical = await run('const fetch = () => 1; console.log(fetch())');
    expect(lexical).toMatchObject({ lines: ['1'], error: null });
  });
});

describe('output limits', () => {
  it('clipText cuts to the limit with an ellipsis', () => {
    expect(clipText('abc', 5)).toBe('abc');
    expect(clipText('abcde', 5)).toBe('abcde');
    expect(clipText('abcdef', 5)).toBe('abcd…');
    expect(clipText('x'.repeat(10_000))).toHaveLength(MAX_LINE_LENGTH);
  });

  it('clipText never splits a surrogate pair', () => {
    expect(clipText('ab😀cd', 4)).toBe('ab…');
    expect(clipText('a😀bcd', 4)).toBe('a😀…');
  });

  it('limitLines caps line length, line count and total size', () => {
    expect(limitLines([1, 'a', null])).toEqual(['1', 'a', 'null']);
    expect(limitLines(['y'.repeat(3000)])).toEqual(['y'.repeat(MAX_LINE_LENGTH - 1) + ELLIPSIS]);

    const many = limitLines(Array.from({ length: 1000 }, (_, i) => String(i)));
    expect(many).toHaveLength(MAX_LINES + 1);
    expect(many[MAX_LINES]).toBe(ELLIPSIS);

    const big = limitLines(Array.from({ length: 100 }, () => 'z'.repeat(MAX_LINE_LENGTH)));
    expect(big.at(-1)).toBe(ELLIPSIS);
    expect(big.join('').length).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH + 1);
    expect(limitLines(big)).toEqual(big);
  });
});

describe('sandbox pages', () => {
  it('embeds the code safely in the WebView page', () => {
    const html = buildRunnerHtml({ code: 'console.log("</script><b>")' });
    expect(html.split('</script>')).toHaveLength(2);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('ReactNativeWebView.postMessage');
  });

  it('builds a worker script that parses', () => {
    expect(() => new vm.Script(buildWorkerSource({ code: 'console.log(1)' }))).not.toThrow();
  });

  it('locks down the WebView page with a CSP', () => {
    const html = buildRunnerHtml({ code: '1' });
    expect(html).toMatch(/default-src 'none'/);
    expect(html).toMatch(/worker-src 'none'/);
    expect(html).toMatch(/form-action 'none'/);
  });

  /** The inline script of a sandbox iframe page, run with fake browser globals. */
  function runFrameScript(html: string, globals: Record<string, unknown>) {
    const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
    const posted: unknown[][] = [];
    const ctx = vm.createContext({
      Blob: function Blob() {},
      URL: { createObjectURL: () => 'blob:sandbox/1' },
      encodeURIComponent,
      parent: { postMessage: (...args: unknown[]) => posted.push(args) },
      ...globals,
    });
    vm.runInContext(script, ctx);
    return posted;
  }

  it('builds a sandbox iframe page that relays the first worker message', () => {
    const worker = buildWorkerSource({ code: 'console.log("</script><b>")' });
    const html = buildSandboxFrameHtml(worker, 'https://app.example');
    expect(html.split('</script>')).toHaveLength(2);
    // The Worker inherits this CSP: no connect-src, so every request is blocked.
    expect(html).toMatch(/default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:;/);
    expect(html).not.toMatch(/connect-src/);

    const workers: FakeWorker[] = [];
    class FakeWorker {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      terminated = false;
      constructor(readonly url: string) {
        workers.push(this);
      }
      terminate() {
        this.terminated = true;
      }
    }
    const posted = runFrameScript(html, { Worker: FakeWorker });
    expect(workers.map(w => w.url)).toEqual(['blob:sandbox/1']);
    workers[0].onmessage?.({ data: { lines: ['1'] } });
    workers[0].onmessage?.({ data: { lines: ['2'] } });
    expect(posted).toEqual([
      [{ result: { lines: ['1'] }, source: FRAME_MESSAGE_SOURCE }, 'https://app.example'],
    ]);
    expect(workers[0].terminated).toBe(true);
  });

  it('reports a worker that fails to start', () => {
    const posted = runFrameScript(buildSandboxFrameHtml('', '*'), {
      Worker: function Worker() {
        throw new Error('blocked');
      },
    });
    expect(posted).toEqual([[{ failed: 'blocked', source: FRAME_MESSAGE_SOURCE }, '*']]);
  });
});

describe('isRunnerNavigationAllowed', () => {
  it('allows only the inline page', () => {
    expect(isRunnerNavigationAllowed('about:blank')).toBe(true);
    expect(isRunnerNavigationAllowed('about:srcdoc')).toBe(true);
    const blocked = [
      'https://example.com',
      'http://localhost:8081',
      'data:text/html,<script>alert(1)</script>',
      'javascript:alert(1)',
      'blob:null/1',
      'about:blankx',
      'tel:123',
      '',
    ];
    for (const url of blocked) expect(isRunnerNavigationAllowed(url)).toBe(false);
  });
});

describe('parseRunResult', () => {
  it('accepts JSON strings and objects', () => {
    const r = { lines: ['1'], error: { name: 'TypeError', message: 'x' }, timedOut: false };
    expect(parseRunResult(JSON.stringify(r))).toEqual(r);
    expect(parseRunResult({ lines: [], error: null, timedOut: true, value: '4' })).toEqual({
      lines: [],
      error: null,
      timedOut: true,
      value: '4',
    });
  });

  it('rejects anything else', () => {
    expect(parseRunResult('not json')).toBeNull();
    expect(parseRunResult({ hello: 1 })).toBeNull();
    expect(parseRunResult(null)).toBeNull();
  });

  it('enforces the output limits on whatever the sandbox sends', () => {
    const huge = 'q'.repeat(1e6);
    const r = parseRunResult({
      lines: Array.from({ length: 10_000 }, () => huge),
      error: { name: huge, message: huge, inPromise: 'yes', extra: huge },
      timedOut: 'no',
      value: huge,
    });
    expect(r).not.toBeNull();
    expect(r!.lines.at(-1)).toBe(ELLIPSIS);
    expect(r!.lines.join('').length).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH + 1);
    expect(r!.lines.every(line => line.length <= MAX_LINE_LENGTH)).toBe(true);
    expect(r!.error).toEqual({
      name: 'q'.repeat(MAX_LINE_LENGTH - 1) + ELLIPSIS,
      message: 'q'.repeat(MAX_LINE_LENGTH - 1) + ELLIPSIS,
    });
    expect(r!.value).toHaveLength(MAX_LINE_LENGTH);
    expect(r!.timedOut).toBe(false);
  });

  it('does not throw on values that cannot be turned into strings', () => {
    // A snippet on native can post this JSON itself via window.ReactNativeWebView.
    const forged = JSON.stringify({
      lines: [{ toString: 1, valueOf: 1 }, 'ok'],
      error: { name: { toString: 1 }, message: { valueOf: 1, toString: 'x' } },
      timedOut: false,
    });
    expect(parseRunResult(forged)).toEqual({
      lines: ['', 'ok'],
      error: { name: '', message: '' },
      timedOut: false,
    });
  });
});

describe('describeError', () => {
  it('reads like the browser console', () => {
    expect(describeError({ name: 'TypeError', message: 'x is not a function' })).toBe(
      'Uncaught TypeError: x is not a function',
    );
    expect(describeError({ name: 'Error', message: 'нет сети', inPromise: true })).toBe(
      'Uncaught (in promise) Error: нет сети',
    );
    expect(describeError({ name: '', message: 'oops' })).toBe('Uncaught oops');
  });
});

describe('runInContext', () => {
  const ok: RunResult = { lines: ['ok'], error: null, timedOut: false };
  const refError: RunResult = {
    lines: [],
    error: { name: 'ReferenceError', message: 'rabbit is not defined' },
    timedOut: false,
  };

  it('retries a ReferenceError with the earlier blocks as setup', async () => {
    const fake = jest.fn<ReturnType<RunCode>, Parameters<RunCode>>(async (_code, options) =>
      options?.setup ? ok : refError,
    );
    await expect(runInContext(fake, 'rabbit.eats', ['const rabbit = {}'])).resolves.toBe(ok);
    expect(fake).toHaveBeenLastCalledWith('rabbit.eats', { setup: ['const rabbit = {}'] });
  });

  it('keeps intentional ReferenceErrors', async () => {
    const fake = jest.fn<ReturnType<RunCode>, Parameters<RunCode>>(async () => refError);
    await expect(runInContext(fake, 'console.log(b); // ReferenceError', ['x'])).resolves.toBe(
      refError,
    );
    await expect(runInContext(fake, 'console.log(b)', [])).resolves.toBe(refError);
    await expect(runInContext(fake, 'console.log(b)', ['let a'])).resolves.toBe(refError);
    expect(fake).toHaveBeenCalledTimes(4);
  });
});
