/** Minimal JavaScript tokenizer for syntax highlighting in code blocks. */

export type TokenKind =
  'keyword' | 'string' | 'number' | 'comment' | 'function' | 'punctuation' | 'text';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set(
  (
    'await async break case catch class const continue debugger default delete do else export ' +
    'extends false finally for from function if import in instanceof let new null of return ' +
    'static super switch this throw true try typeof undefined var void while with yield NaN Infinity'
  ).split(' '),
);

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|([{}()[\];,.:?=+\-*/%<>!&|^~])/g;

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) tokens.push({ kind: 'text', text: code.slice(last, index) });
    const [text, comment, str, num, fn, ident] = m;
    let kind: TokenKind = 'punctuation';
    if (comment) kind = 'comment';
    else if (str) kind = 'string';
    else if (num) kind = 'number';
    else if (fn) kind = KEYWORDS.has(fn) ? 'keyword' : 'function';
    else if (ident) kind = KEYWORDS.has(ident) ? 'keyword' : 'text';
    tokens.push({ kind, text });
    last = index + text.length;
  }
  if (last < code.length) tokens.push({ kind: 'text', text: code.slice(last) });
  return tokens;
}

/** Splits pieces of code into lines; a piece spanning several lines is split too. */
export function splitLines<T extends { text: string }>(
  pieces: T[],
  keepEmpty: (piece: T) => boolean = () => false,
): T[][] {
  const lines: T[][] = [[]];
  for (const piece of pieces) {
    piece.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part || keepEmpty(piece)) lines[lines.length - 1].push({ ...piece, text: part });
    });
  }
  return lines;
}

/** Highlighted tokens of `code`, one array per line. */
export function tokenizeLines(code: string): Token[][] {
  return splitLines(tokenize(code));
}
