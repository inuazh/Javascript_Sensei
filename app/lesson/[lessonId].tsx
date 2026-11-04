import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { getLessonRef, getNextLesson } from '../../src/content/repository';
import { resumeLessonSession } from '../../src/domain/lessonSession';
import type { LessonOutcome } from '../../src/domain/progress';
import { TheoryView } from '../../src/features/lesson/TheoryView';
import { QuizSession } from '../../src/features/quiz/QuizSession';
import type { QuizAnswer } from '../../src/features/quiz/quizReducer';
import { ResultView } from '../../src/features/results/ResultView';
import { afterActivity } from '../../src/services/activity';
import { useUserStore } from '../../src/stores/useUserStore';
import { Button, Screen, Type } from '../../src/ui';
import { useGoBack } from '../../src/hooks/useGoBack';

type Phase = 'theory' | 'quiz' | 'result';

const RESULT_TITLE: Record<number, string> = {
  3: 'идеально',
  2: 'отлично',
  1: 'урок пройден',
};

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const ref = useMemo(() => (lessonId ? getLessonRef(lessonId) : undefined), [lessonId]);
  const completeLesson = useUserStore(s => s.completeLesson);
  const totalXp = useUserStore(s => s.progress.totalXp);
  const saveLessonSession = useUserStore(s => s.saveLessonSession);
  const clearLessonSession = useUserStore(s => s.clearLessonSession);
  // Answers of an unfinished attempt (a reload, the app killed): continue at
  // the next question and skip the theory, which was already read.
  const [resumed] = useState(() =>
    ref ? resumeLessonSession(useUserStore.getState().lessonSession, ref.lesson, new Date()) : null,
  );
  const [phase, setPhase] = useState<Phase>(() =>
    ref?.lesson.theory && !resumed ? 'theory' : 'quiz',
  );
  const [outcome, setOutcome] = useState<(LessonOutcome & { correct: number }) | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A saved session of this lesson that cannot be continued (old, or the
  // content changed) is dropped, so it does not linger in storage.
  useEffect(() => {
    if (lessonId && !resumed) clearLessonSession(lessonId);
  }, [lessonId, resumed, clearLessonSession]);

  if (!ref) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>урок не найден</Text>
        <Button title="назад" onPress={goBack} />
      </Screen>
    );
  }

  const { lesson, topic } = ref;
  const close = goBack;

  if (phase === 'theory' && lesson.theory) {
    return (
      <TheoryView
        title={lesson.title}
        label={topic.title}
        theory={lesson.theory}
        onStart={() => setPhase('quiz')}
        onClose={close}
      />
    );
  }

  if (phase === 'result' && outcome) {
    const next = getNextLesson(lesson.id);
    const retry = () => {
      setOutcome(null);
      setAttempt(a => a + 1);
      setPhase('quiz');
    };
    return (
      <ResultView
        score={`${outcome.correct}/${lesson.questions.length}`}
        title={RESULT_TITLE[outcome.stars] ?? RESULT_TITLE[1]}
        subtitle={lesson.title}
        stars={outcome.stars}
        outcome={outcome}
        totalXp={totalXp}
        primary={
          next
            ? {
                title: `дальше: ${next.lesson.title}`,
                onPress: () => router.replace(`/lesson/${next.lesson.id}`),
              }
            : { title: 'на главную', onPress: close }
        }
        secondary={
          outcome.stars < 3
            ? { title: 'пройти ещё раз', onPress: retry }
            : next
              ? { title: 'к карте курса', onPress: close }
              : undefined
        }
      />
    );
  }

  const exit = () => {
    clearLessonSession(lesson.id);
    close();
  };

  const finish = (answers: QuizAnswer[]) => {
    const result = completeLesson({ lessonId: lesson.id, answers });
    afterActivity();
    setOutcome({ ...result, correct: answers.filter(a => a.correct).length });
    setPhase('result');
  };

  return (
    <QuizSession
      key={attempt}
      items={lesson.questions.map(question => ({ question, lessonId: lesson.id }))}
      label={`${topic.title} · ${lesson.title}`}
      onExit={exit}
      onFinish={finish}
      onAnswer={(_answer, answers) => saveLessonSession(lesson, answers)}
      initialAnswers={attempt === 0 ? (resumed ?? undefined) : undefined}
    />
  );
}
