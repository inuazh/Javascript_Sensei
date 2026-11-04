import { tokenize } from '../highlight';

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
