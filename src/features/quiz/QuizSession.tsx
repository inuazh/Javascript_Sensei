import { useEffect, useReducer, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Question } from '../../content/schema';
import { confirmAction } from '../../services/dialog';
import { useFeedback } from '../../services/feedback';
import { Button, Colors, Fonts, Icon, Label, ProgressBar, Spacing, Type } from '../../ui';
import { FeedbackPanel } from './FeedbackPanel';
import { quizReducer, restoreQuiz, type QuizAnswer, type QuizItem } from './quizReducer';
import { getQuestionType, questionTitle } from './registry';

interface QuizSessionProps {
  items: QuizItem<Question>[];
  /** Small label above the question, e.g. the lesson title. */
  label: string;
  onExit: () => void;
  onFinish: (answers: QuizAnswer[]) => void;
  /**
   * Called as soon as an answer is checked, before the explanation is read,
   * with every answer of the session so far (this one included).
   */
  onAnswer?: (answer: QuizAnswer, answers: QuizAnswer[]) => void;
  /** Answers of a saved session: it continues at the next question. */
  initialAnswers?: QuizAnswer[];
  /** Ask before leaving a started session. Off when answers are saved as they come. */
  confirmExitAfterAnswer?: boolean;
  /** Ends the session early, e.g. after too many mistakes in a placement test. */
  shouldStop?: (answers: QuizAnswer[]) => boolean;
}

export function QuizSession({
  items,
  label,
  onExit,
  onFinish,
  onAnswer,
  confirmExitAfterAnswer = true,
  shouldStop,
  initialAnswers = [],
}: QuizSessionProps) {
  const feedback = useFeedback();
  const scrollRef = useRef<ScrollView>(null);
  const [state, dispatch] = useReducer(quizReducer, items[initialAnswers.length], first =>
    restoreQuiz(
      initialAnswers,
      items.length,
      first ? getQuestionType(first.question).initialAnswer(first.question) : null,
    ),
  );

  const item = items[state.index];
  const finished = state.phase === 'finished';
  useEffect(() => {
    if (finished) onFinish(state.answers);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps -- fire once

  // Android back button asks before dropping the session, like the close button.
  const exitRef = useRef<() => void>(onExit);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!item || finished) return null;
  const { question } = item;
  const def = getQuestionType(question);
  const revealed = state.phase === 'revealed';
  const stopping = revealed && !!shouldStop?.(state.answers);
  const isLast = state.index + 1 >= items.length || stopping;
  const QuestionView = def.Component;

  const check = () => {
    if (state.answer === null) return;
    const correct = def.isCorrect(question, state.answer);
    if (correct) feedback.success();
    else feedback.error();
    dispatch({ type: 'CHECK', correct, item });
    const answer: QuizAnswer = { questionId: question.id, lessonId: item.lessonId, correct };
    onAnswer?.(answer, [...state.answers, answer]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const next = () => {
    const nextItem = items[state.index + 1];
    dispatch({
      type: 'NEXT',
      total: stopping ? state.index + 1 : items.length,
      initialAnswer: nextItem
        ? getQuestionType(nextItem.question).initialAnswer(nextItem.question)
        : null,
    });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const confirmExit = () => {
    if (state.answers.length === 0 || !confirmExitAfterAnswer) return onExit();
    confirmAction({
      title: 'прервать?',
      message: 'прогресс этой сессии не сохранится',
      confirmText: 'выйти',
      cancelText: 'остаться',
      onConfirm: onExit,
    });
  };
  exitRef.current = confirmExit;

  const progress = (state.index + (revealed ? 1 : 0)) / items.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={confirmExit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="закрыть"
        >
          <Icon name="x" size={22} color={Colors.textMuted} />
        </Pressable>
        <ProgressBar value={progress} style={styles.progress} />
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
        <Label>{label}</Label>
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
            runnableCode={def.runnableCode(question)}
            report={{
              questionId: question.id,
              lessonId: item.lessonId,
              answer: state.answer === null ? '' : def.answerText(question, state.answer),
            }}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {revealed ? (
          <Button
            title={isLast ? 'завершить' : 'дальше'}
            icon={isLast ? 'check' : 'arrow-right'}
            variant="primary"
            onPress={next}
          />
        ) : (
          <Button title="проверить" onPress={check} disabled={state.answer === null} />
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
  progress: { flex: 1 },
  counter: {
    fontFamily: Fonts.mono,
    color: Colors.textMuted,
    fontSize: 13,
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
