import vm from 'node:vm';
import {
  HARNESS_JS,
  buildRunnerHtml,
  buildWorkerSource,
  describeError,
  parseRunResult,
  runInContext,
  type RunCode,
  type RunJob,
  type RunResult,
} from '../runnerHarness';

/** Runs the harness in a fresh Node realm, the way the WebView page / Worker does. */
function run(code: string, extra: Partial<RunJob> = {}): Promise<RunResult> {
  return new Promise(resolve => {
    const timers = { setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask };
    const ctx = vm.createContext({ console: {}, ...timers });
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
