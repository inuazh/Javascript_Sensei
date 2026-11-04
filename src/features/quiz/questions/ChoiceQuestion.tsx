import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoiceQuestion as ChoiceQuestionT } from '../../../content/schema';
import { CodeBlock, Colors, Fonts, Icon, Radius, Spacing, alpha } from '../../../ui';
import { optionOrder } from '../shuffle';
import type { QuestionViewProps } from '../types';

const LABELS = ['a', 'b', 'c', 'd', 'e', 'f'];

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

const STATE_COLOR: Record<OptionState, string> = {
  idle: Colors.border,
  selected: Colors.textPrimary,
  correct: Colors.success,
  wrong: Colors.danger,
  dimmed: Colors.border,
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
          const active = state !== 'idle' && state !== 'dimmed';
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
                { borderColor: color },
                active && { backgroundColor: alpha(color, 0.06) },
                state === 'dimmed' && styles.dimmed,
                pressed && !revealed && styles.pressed,
              ]}
            >
              {!isTrueFalse && (
                <View style={[styles.key, active && { borderColor: color }]}>
                  {state === 'correct' || state === 'wrong' ? (
                    <Icon name={state === 'correct' ? 'check' : 'x'} size={14} color={color} />
                  ) : (
                    <Text style={[styles.keyText, active && { color }]}>{LABELS[position]}</Text>
                  )}
                </View>
              )}
              <Text
                style={[
                  isTrueFalse ? styles.textTrueFalse : styles.text,
                  active && { color: state === 'selected' ? Colors.textPrimary : color },
                ]}
              >
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
  list: { gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  optionTrueFalse: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  dimmed: { opacity: 0.45 },
  pressed: { backgroundColor: Colors.surfaceRaised },
  key: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontFamily: Fonts.monoBold, fontSize: 12, color: Colors.textMuted },
  text: { flex: 1, fontFamily: Fonts.mono, fontSize: 14, color: Colors.textPrimary },
  textTrueFalse: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
