import { StyleSheet, Text, View } from 'react-native';
import { CodeBlock, Colors, Fonts, Icon, Radius, RichText, Spacing } from '../../ui';
import type { CorrectAnswerView } from './types';

interface FeedbackPanelProps {
  correct: boolean;
  explanation: string;
  correctAnswer: CorrectAnswerView;
  note: string | null;
}

const PRAISE = ['Верно', 'Точно', 'В точку', 'Правильно', 'Отлично'];

export function FeedbackPanel({ correct, explanation, correctAnswer, note }: FeedbackPanelProps) {
  const color = correct ? Colors.success : Colors.danger;
  const praise = PRAISE[explanation.length % PRAISE.length];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.panel, { borderLeftColor: color }]}>
      <View style={styles.titleRow}>
        <Icon name={correct ? 'check-circle' : 'x-circle'} size={18} color={color} />
        <Text style={[styles.title, { color }]}>{correct ? praise : 'Не совсем'}</Text>
      </View>
      {!correct && correctAnswer.text ? (
        <Text style={styles.answer}>
          Правильный ответ: <Text style={styles.answerValue}>{correctAnswer.text}</Text>
        </Text>
      ) : null}
      {!correct && correctAnswer.code ? <CodeBlock code={correctAnswer.code} /> : null}
      {!correct && note ? <RichText text={note} style={styles.note} /> : null}
      <RichText text={explanation} style={styles.explanation} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Fonts.monoBold, fontSize: 16 },
  answer: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.textSecondary },
  answerValue: { fontFamily: Fonts.monoBold, color: Colors.success },
  note: { fontSize: 14, lineHeight: 21, color: Colors.warning },
  explanation: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
