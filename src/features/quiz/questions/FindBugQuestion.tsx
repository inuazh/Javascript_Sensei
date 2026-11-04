import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FindBugQuestion as FindBugQuestionT } from '../../../content/schema';
import { Colors, Fonts, Radius, Spacing, alpha, tokenStyle } from '../../../ui';
import { tokenizeLines } from '../../../ui/highlight';
import type { QuestionViewProps } from '../types';

type LineState = 'idle' | 'selected' | 'bug' | 'wrong';

function lineState(
  line: number,
  answer: number | null,
  bugLine: number,
  revealed: boolean,
): LineState {
  if (!revealed) return answer === line ? 'selected' : 'idle';
  if (line === bugLine) return 'bug';
  if (line === answer) return 'wrong';
  return 'idle';
}

const STATE_LABEL: Record<LineState, string> = {
  idle: '',
  selected: '',
  bug: ', ошибка здесь',
  wrong: ', твой ответ',
};

/** Tap the line with the bug. The answer is the 1-based line number. */
export function FindBugQuestion({
  question,
  answer,
  onChange,
  revealed,
}: QuestionViewProps<FindBugQuestionT, number>) {
  const lines = useMemo(() => tokenizeLines(question.code), [question.code]);
  const sourceLines = useMemo(() => question.code.split('\n'), [question.code]);
  const digits = String(lines.length).length;

  return (
    <View style={styles.wrap}>
      {!revealed && <Text style={styles.hint}>{'// нажми на строку с ошибкой'}</Text>}
      <View style={styles.block}>
        <Text style={styles.filename}>main.js</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.body} accessibilityRole="radiogroup">
            {lines.map((tokens, i) => {
              const line = i + 1;
              const source = sourceLines[i]?.trim() ?? '';
              const blank = source === '';
              const state = lineState(line, answer, question.bugLine, revealed);
              return (
                <Pressable
                  key={line}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: answer === line, disabled: revealed || blank }}
                  accessibilityLabel={`строка ${line}: ${blank ? 'пустая' : source}${STATE_LABEL[state]}`}
                  disabled={revealed || blank}
                  onPress={() => onChange(line)}
                  style={({ pressed }) => [
                    styles.line,
                    state === 'selected' && styles.lineSelected,
                    state === 'bug' && styles.lineBug,
                    state === 'wrong' && styles.lineWrong,
                    pressed && !revealed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.lineNumber,
                      { width: digits * 9 + 6 },
                      state === 'selected' && styles.lineNumberSelected,
                      state === 'bug' && styles.lineNumberBug,
                    ]}
                  >
                    {line}
                  </Text>
                  <Text style={styles.code}>
                    {tokens.map((t, k) => (
                      <Text key={k} style={tokenStyle(t.kind)}>
                        {t.text}
                      </Text>
                    ))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  hint: { fontFamily: Fonts.mono, color: Colors.textMuted, fontSize: 12 },
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
  scroll: { flexGrow: 1 },
  body: { flexGrow: 1, padding: Spacing.sm },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.codeBackground,
  },
  lineSelected: {
    borderColor: Colors.textPrimary,
    backgroundColor: alpha(Colors.textPrimary, 0.06),
  },
  lineBug: { borderColor: Colors.accent, backgroundColor: alpha(Colors.accent, 0.12) },
  lineWrong: { borderColor: Colors.borderStrong, borderStyle: 'dashed', opacity: 0.45 },
  pressed: { backgroundColor: Colors.surfaceRaised },
  lineNumber: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 22,
    color: Colors.syntax.lineNumber,
    textAlign: 'right',
    marginRight: Spacing.md,
  },
  lineNumberSelected: { color: Colors.textPrimary },
  lineNumberBug: { fontFamily: Fonts.monoBold, color: Colors.accent },
  code: { fontFamily: Fonts.mono, fontSize: 13.5, lineHeight: 22, color: Colors.syntax.text },
});
