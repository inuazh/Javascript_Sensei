import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { splitLines, tokenize, type Token, type TokenKind } from './highlight';
import { Colors, Fonts, Radius, Spacing, alpha } from './theme';

const TOKEN_COLORS: Record<TokenKind, string> = {
  keyword: Colors.syntax.keyword,
  string: Colors.syntax.string,
  number: Colors.syntax.number,
  comment: Colors.syntax.comment,
  function: Colors.syntax.function,
  punctuation: Colors.syntax.punctuation,
  text: Colors.syntax.text,
};

type Piece = Token | { kind: 'gap'; text: string };

/** Text style of a highlighted token. Shared with other code views. */
export function tokenStyle(kind: TokenKind): TextStyle {
  return {
    color: TOKEN_COLORS[kind],
    fontFamily: kind === 'keyword' ? Fonts.monoBold : Fonts.mono,
    fontStyle: kind === 'comment' ? 'italic' : 'normal',
  };
}

interface CodeBlockProps {
  code: string;
  /** Renders `code` + a highlighted gap + `after` (for fill-in questions). */
  gap?: { after: string; value?: string | null };
  caption?: string;
  /** Name shown in the editor tab. */
  filename?: string;
  style?: ViewStyle;
}

export function CodeBlock({ code, gap, caption, filename = 'main.js', style }: CodeBlockProps) {
  const lines = useMemo(() => {
    const pieces: Piece[] = [...tokenize(code)];
    if (gap) {
      pieces.push({ kind: 'gap', text: gap.value ? ` ${gap.value} ` : ' ___ ' });
      pieces.push(...tokenize(gap.after));
    }
    return splitLines(pieces, p => p.kind === 'gap');
  }, [code, gap]);
  const digits = String(lines.length).length;

  return (
    <View style={[styles.block, style]}>
      <Text style={styles.filename}>{filename}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View style={styles.body}>
          {lines.map((line, n) => (
            <View key={n} style={styles.line}>
              <Text style={[styles.lineNumber, { width: digits * 9 + 6 }]}>{n + 1}</Text>
              <Text style={styles.code} selectable>
                {line.map((p, i) =>
                  p.kind === 'gap' ? (
                    <Text key={i} style={[styles.gap, gap?.value ? styles.gapFilled : null]}>
                      {p.text}
                    </Text>
                  ) : (
                    <Text key={i} style={tokenStyle(p.kind)}>
                      {p.text}
                    </Text>
                  ),
                )}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.codeBackground,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  filename: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  body: { paddingVertical: Spacing.md, paddingRight: Spacing.lg },
  line: { flexDirection: 'row' },
  lineNumber: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 22,
    color: Colors.syntax.lineNumber,
    textAlign: 'right',
    marginRight: Spacing.md,
  },
  code: { fontFamily: Fonts.mono, fontSize: 13.5, lineHeight: 22, color: Colors.syntax.text },
  gap: {
    color: Colors.accent,
    backgroundColor: alpha(Colors.accent, 0.12),
    fontFamily: Fonts.monoBold,
  },
  gapFilled: { color: Colors.textOnInverse, backgroundColor: Colors.inverse },
  caption: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
