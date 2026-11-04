import { tokenize, tokenizeLines } from '../highlight';

describe('tokenizeLines', () => {
  it('splits tokens into lines, including tokens spanning lines', () => {
    const code = 'const a = `x\ny`;\n\nfoo(a);';
    const lines = tokenizeLines(code);
    expect(lines.map(l => l.map(t => t.text).join(''))).toEqual(code.split('\n'));
    expect(lines[1][0]).toEqual({ kind: 'string', text: 'y`' });
    expect(lines[2]).toEqual([]);
  });
});

describe('tokenize', () => {
  it('splits code into highlighted tokens without losing text', () => {
    const code = "const s = 'a // b'; // note\nfoo(42, `x`)";
    const tokens = tokenize(code);
    expect(tokens.map(t => t.text).join('')).toBe(code);
    const kinds = Object.fromEntries(tokens.map(t => [t.text, t.kind]));
    expect(kinds).toMatchObject({
      const: 'keyword',
      "'a // b'": 'string',
      '// note': 'comment',
      foo: 'function',
      '42': 'number',
      '`x`': 'string',
    });
  });
});
