import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { getLessonRef, getNextLesson } from '../../src/content/repository';
import type { LessonOutcome } from '../../src/domain/progress';
import { TheoryView } from '../../src/features/lesson/TheoryView';
import { QuizSession } from '../../src/features/quiz/QuizSession';
import type { QuizAnswer } from '../../src/features/quiz/quizReducer';
import { ResultView } from '../../src/features/results/ResultView';
import { afterActivity } from '../../src/services/activity';
import { useUserStore } from '../../src/stores/useUserStore';
import { Button, Screen, Type, getSectionColor } from '../../src/ui';

type Phase = 'theory' | 'quiz' | 'result';

const RESULT_COPY: Record<number, { emoji: string; title: string }> = {
  3: { emoji: '🏆', title: 'Идеально!' },
  2: { emoji: '🎉', title: 'Отлично!' },
  1: { emoji: '💪', title: 'Урок пройден' },
};

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const ref = useMemo(() => (lessonId ? getLessonRef(lessonId) : undefined), [lessonId]);
  const completeLesson = useUserStore(s => s.completeLesson);
  const totalXp = useUserStore(s => s.progress.totalXp);
  const [phase, setPhase] = useState<Phase>(() => (ref?.lesson.theory ? 'theory' : 'quiz'));
  const [outcome, setOutcome] = useState<(LessonOutcome & { correct: number }) | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (!ref) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>Урок не найден</Text>
        <Button title="Назад" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { lesson, topic, section } = ref;
  const color = getSectionColor(section);
  const close = () => router.back();

  if (phase === 'theory' && lesson.theory) {
    return (
      <TheoryView
        title={lesson.title}
        label={topic.title}
        color={color}
        theory={lesson.theory}
        onStart={() => setPhase('quiz')}
        onClose={close}
      />
    );
  }

  if (phase === 'result' && outcome) {
    const next = getNextLesson(lesson.id);
    const copy = RESULT_COPY[outcome.stars] ?? RESULT_COPY[1];
    const retry = () => {
      setOutcome(null);
      setAttempt(a => a + 1);
      setPhase('quiz');
    };
    return (
      <ResultView
        emoji={copy.emoji}
        title={copy.title}
        subtitle={`${outcome.correct} из ${lesson.questions.length} правильно · ${lesson.title}`}
        stars={outcome.stars}
        outcome={outcome}
        totalXp={totalXp}
        primary={
          next
            ? {
                title: `Дальше: ${next.lesson.title} →`,
                onPress: () => router.replace(`/lesson/${next.lesson.id}`),
              }
            : { title: 'На главную', onPress: close }
        }
        secondary={
          outcome.stars < 3
            ? { title: 'Пройти ещё раз', onPress: retry }
            : { title: 'К карте курса', onPress: close }
        }
      />
    );
  }

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
      color={color}
      onExit={close}
      onFinish={finish}
    />
  );
}
