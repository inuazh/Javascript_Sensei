import { StyleSheet, Text, View } from 'react-native';
import { CodeBlock, Colors, Fonts, Radius, RichText, Spacing, alpha } from '../../ui';
import type { CorrectAnswerView } from './types';

interface FeedbackPanelProps {
  correct: boolean;
  explanation: string;
  correctAnswer: CorrectAnswerView;
  note: string | null;
}

const PRAISE = ['Отлично!', 'Верно!', 'Точно!', 'Так держать!', 'В точку!'];

export function FeedbackPanel({ correct, explanation, correctAnswer, note }: FeedbackPanelProps) {
  const color = correct ? Colors.success : Colors.danger;
  const praise = PRAISE[explanation.length % PRAISE.length];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.panel,
        { backgroundColor: alpha(color, 0.08), borderColor: alpha(color, 0.25) },
      ]}
    >
      <Text style={[styles.title, { color }]}>{correct ? `✓ ${praise}` : '✗ Не совсем'}</Text>
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
  panel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: 17, fontWeight: '800' },
  answer: { fontSize: 14, color: Colors.textSecondary },
  answerValue: { fontFamily: Fonts.mono, color: Colors.success, fontWeight: '700' },
  note: { fontSize: 14, color: Colors.orange },
  explanation: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
