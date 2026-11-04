import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reportQuestion, type QuestionReport } from '../../services/support';
import { CodeBlock, Colors, Fonts, Icon, Radius, RichText, Spacing } from '../../ui';
import { RunCode } from '../runner/RunCode';
import type { CorrectAnswerView } from './types';

interface FeedbackPanelProps {
  correct: boolean;
  explanation: string;
  correctAnswer: CorrectAnswerView;
  note: string | null;
  /** Code to run with «Запустить», if the question has any. */
  runnableCode: string | null;
  /** Details for the «ошибка в задании?» letter. */
  report: QuestionReport;
}

const PRAISE = ['верно', 'точно', 'в точку', 'правильно', 'отлично'];

export function FeedbackPanel({
  correct,
  explanation,
  correctAnswer,
  note,
  runnableCode,
  report,
}: FeedbackPanelProps) {
  const color = correct ? Colors.success : Colors.danger;
  const praise = PRAISE[explanation.length % PRAISE.length];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.panel, { borderLeftColor: color }]}>
      <View style={styles.titleRow}>
        <Icon name={correct ? 'check-circle' : 'x-circle'} size={18} color={color} />
        <Text style={[styles.title, { color }]}>{correct ? praise : 'не совсем'}</Text>
      </View>
      {!correct && correctAnswer.text ? (
        <Text style={styles.answer}>
          правильный ответ: <Text style={styles.answerValue}>{correctAnswer.text}</Text>
        </Text>
      ) : null}
      {!correct && correctAnswer.code ? <CodeBlock code={correctAnswer.code} /> : null}
      {!correct && note ? <RichText text={note} style={styles.note} /> : null}
      <RichText text={explanation} style={styles.explanation} />
      {runnableCode ? <RunCode code={runnableCode} /> : null}
      <Pressable
        onPress={() => void reportQuestion(report)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="сообщить об ошибке в задании"
        style={({ pressed }) => [styles.report, pressed && styles.reportPressed]}
      >
        <Icon name="flag" size={12} color={Colors.textMuted} />
        <Text style={styles.reportText}>ошибка в задании?</Text>
      </Pressable>
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
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  reportPressed: { opacity: 0.6 },
  reportText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
});
