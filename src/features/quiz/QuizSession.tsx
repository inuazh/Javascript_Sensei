import { useEffect, useReducer, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Question } from '../../content/schema';
import { useFeedback } from '../../services/feedback';
import { Button, Colors, ProgressBar, Spacing, Type } from '../../ui';
import { FeedbackPanel } from './FeedbackPanel';
import { initQuiz, quizReducer, type QuizAnswer, type QuizItem } from './quizReducer';
import { getQuestionType, questionTitle } from './registry';

interface QuizSessionProps {
  items: QuizItem<Question>[];
  /** Small label above the question, e.g. the lesson title. */
  label: string;
  color?: string;
  onExit: () => void;
  onFinish: (answers: QuizAnswer[]) => void;
}

export function QuizSession({
  items,
  label,
  color = Colors.yellow,
  onExit,
  onFinish,
}: QuizSessionProps) {
  const feedback = useFeedback();
  const scrollRef = useRef<ScrollView>(null);
  const [state, dispatch] = useReducer(quizReducer, items[0], first =>
    initQuiz(first ? getQuestionType(first.question).initialAnswer(first.question) : null),
  );

  const item = items[state.index];
  const finished = state.phase === 'finished';
  useEffect(() => {
    if (finished) onFinish(state.answers);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps -- fire once

  if (!item || finished) return null;
  const { question } = item;
  const def = getQuestionType(question);
  const revealed = state.phase === 'revealed';
  const isLast = state.index + 1 >= items.length;
  const QuestionView = def.Component;

  const check = () => {
    if (state.answer === null) return;
    const correct = def.isCorrect(question, state.answer);
    if (correct) feedback.success();
    else feedback.error();
    dispatch({ type: 'CHECK', correct, item });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const next = () => {
    const nextItem = items[state.index + 1];
    dispatch({
      type: 'NEXT',
      total: items.length,
      initialAnswer: nextItem
        ? getQuestionType(nextItem.question).initialAnswer(nextItem.question)
        : null,
    });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const confirmExit = () => {
    if (state.answers.length === 0) return onExit();
    Alert.alert('Прервать?', 'Прогресс этой сессии не сохранится.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: onExit },
    ]);
  };

  const progress = (state.index + (revealed ? 1 : 0)) / items.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={confirmExit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <ProgressBar value={progress} color={color} style={styles.progress} />
        <Text style={styles.counter}>
          {state.index + 1}/{items.length}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[Type.caption, { color }]}>{label}</Text>
        <Text style={styles.title}>{questionTitle(question)}</Text>
        <QuestionView
          key={question.id}
          question={question}
          answer={state.answer}
          onChange={answer => {
            feedback.tap();
            dispatch({ type: 'CHANGE', answer });
          }}
          revealed={revealed}
        />
        {revealed && state.lastCorrect !== null && (
          <FeedbackPanel
            correct={state.lastCorrect}
            explanation={question.explanation}
            correctAnswer={def.correctAnswer(question)}
            note={def.answerNote?.(question, state.answer) ?? null}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {revealed ? (
          <Button
            title={isLast ? 'Завершить' : 'Дальше →'}
            variant={state.lastCorrect ? 'success' : 'primary'}
            onPress={next}
          />
        ) : (
          <Button title="Проверить" onPress={check} disabled={state.answer === null} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  close: { fontSize: 20, color: Colors.textMuted, paddingHorizontal: 4 },
  progress: { flex: 1 },
  counter: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  body: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  title: { ...Type.h2, marginTop: -Spacing.sm },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
