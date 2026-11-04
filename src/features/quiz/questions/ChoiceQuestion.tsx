import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoiceQuestion as ChoiceQuestionT } from '../../../content/schema';
import { CodeBlock, Colors, Fonts, Radius, Spacing, alpha } from '../../../ui';
import { optionOrder } from '../shuffle';
import type { QuestionViewProps } from '../types';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

function optionState(
  index: number,
  answer: number | null,
  correct: number,
  revealed: boolean,
): OptionState {
  if (!revealed) return answer === index ? 'selected' : 'idle';
  if (index === correct) return 'correct';
  if (index === answer) return 'wrong';
  return 'dimmed';
}

const STATE_COLOR: Record<OptionState, string | null> = {
  idle: null,
  selected: Colors.yellow,
  correct: Colors.success,
  wrong: Colors.danger,
  dimmed: null,
};

export function ChoiceQuestion({
  question,
  answer,
  onChange,
  revealed,
}: QuestionViewProps<ChoiceQuestionT, number>) {
  const isTrueFalse = question.type === 'trueFalse';
  // New random order each time the question is shown (the view is keyed by question id).
  const order = useMemo(() => optionOrder(question.options), [question.options]);
  const code =
    question.type === 'fill' ? (
      <CodeBlock
        code={question.codeBefore}
        gap={{
          after: question.codeAfter,
          value: answer !== null ? question.options[answer] : null,
        }}
      />
    ) : question.code ? (
      <CodeBlock code={question.code} />
    ) : null;

  return (
    <View style={styles.wrap}>
      {code}
      <View style={isTrueFalse ? styles.row : styles.list}>
        {order.map((i, position) => {
          const option = question.options[i];
          const state = optionState(i, answer, question.correct, revealed);
          const color = STATE_COLOR[state];
          return (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ selected: answer === i, disabled: revealed }}
              accessibilityLabel={option}
              disabled={revealed}
              onPress={() => onChange(i)}
              style={({ pressed }) => [
                styles.option,
                isTrueFalse && styles.optionTrueFalse,
                color && { backgroundColor: alpha(color, 0.1), borderColor: alpha(color, 0.6) },
                state === 'dimmed' && styles.dimmed,
                pressed && !revealed && styles.pressed,
              ]}
            >
              {!isTrueFalse && (
                <View style={[styles.label, color && { backgroundColor: alpha(color, 0.2) }]}>
                  <Text style={[styles.labelText, color && { color }]}>
                    {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : LABELS[position]}
                  </Text>
                </View>
              )}
              <Text style={[isTrueFalse ? styles.textTrueFalse : styles.text, color && { color }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  list: { gap: Spacing.sm + 2 },
  row: { flexDirection: 'row', gap: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md + 2,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionTrueFalse: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  dimmed: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  label: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  labelText: { fontWeight: '800', fontSize: 12, color: Colors.textMuted },
  text: { flex: 1, fontFamily: Fonts.mono, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  textTrueFalse: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
});
