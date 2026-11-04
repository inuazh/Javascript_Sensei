import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { tokenize, type TokenKind } from './highlight';
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

function Highlighted({ code }: { code: string }) {
  const tokens = useMemo(() => tokenize(code), [code]);
  return (
    <>
      {tokens.map((t, i) => (
        <Text
          key={i}
          style={{
            color: TOKEN_COLORS[t.kind],
            fontStyle: t.kind === 'comment' ? 'italic' : 'normal',
          }}
        >
          {t.text}
        </Text>
      ))}
    </>
  );
}

interface CodeBlockProps {
  code: string;
  /** Renders `code` + a highlighted gap + `after` (for fill-in questions). */
  gap?: { after: string; value?: string | null };
  caption?: string;
  style?: ViewStyle;
}

export function CodeBlock({ code, gap, caption, style }: CodeBlockProps) {
  return (
    <View style={[styles.block, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <Text style={styles.code} selectable>
          <Highlighted code={code} />
          {gap ? (
            <>
              <Text style={[styles.gap, gap.value ? styles.gapFilled : null]}>
                {gap.value ? ` ${gap.value} ` : ' ??? '}
              </Text>
              <Highlighted code={gap.after} />
            </>
          ) : null}
        </Text>
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  code: { fontFamily: Fonts.mono, fontSize: 14, lineHeight: 22, color: Colors.syntax.text },
  gap: {
    color: Colors.yellow,
    backgroundColor: alpha(Colors.yellow, 0.15),
    fontWeight: '700',
  },
  gapFilled: { color: Colors.textOnAccent, backgroundColor: Colors.yellow },
  caption: { marginTop: Spacing.sm, fontSize: 12, color: Colors.textMuted },
});
