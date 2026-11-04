import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { getQuestion, questionExists } from '../src/content/repository';
import type { Question } from '../src/content/schema';
import { toDayKey } from '../src/domain/dates';
import type { WorkoutOutcome } from '../src/domain/progress';
import { planWorkout } from '../src/domain/review';
import { QuizSession } from '../src/features/quiz/QuizSession';
import type { QuizAnswer, QuizItem } from '../src/features/quiz/quizReducer';
import { ResultView } from '../src/features/results/ResultView';
import { afterActivity } from '../src/services/activity';
import { useUserStore } from '../src/stores/useUserStore';
import { Button, Screen, Type } from '../src/ui';
import { useGoBack } from '../src/hooks/useGoBack';

/** Daily workout: spaced-repetition review of earlier questions. */
export default function ReviewScreen() {
  const goBack = useGoBack();
  const completeWorkout = useUserStore(s => s.completeWorkout);
  const totalXp = useUserStore(s => s.progress.totalXp);
  const [outcome, setOutcome] = useState<WorkoutOutcome | null>(null);

  // Plan once when the screen opens; answering must not reshuffle the queue.
  const plan = useMemo(() => {
    const review = useUserStore.getState().progress.review;
    const p = planWorkout(review, toDayKey(new Date()), { exists: questionExists });
    const items: QuizItem<Question>[] = [];
    for (const id of p.questionIds) {
      const found = getQuestion(id);
      if (found) items.push({ question: found.question, lessonId: found.lesson.id });
    }
    return { items, dueIds: p.dueIds };
  }, []);

  if (outcome) {
    const perfect = outcome.correct === outcome.total;
    return (
      <ResultView
        score={`${outcome.correct}/${outcome.total}`}
        title={perfect ? 'всё помнишь' : 'тренировка завершена'}
        subtitle={
          outcome.mistakesFixed > 0
            ? `исправлено ошибок: ${outcome.mistakesFixed}`
            : 'повторение закрепляет знания'
        }
        outcome={outcome}
        totalXp={totalXp}
        primary={{ title: 'готово', onPress: goBack }}
      />
    );
  }

  if (plan.items.length === 0) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>пока нечего повторять</Text>
        <Text style={Type.small}>пройди пару уроков, и вопросы из них появятся в тренировке.</Text>
        <Button title="назад" onPress={goBack} />
      </Screen>
    );
  }

  const finish = (answers: QuizAnswer[]) => {
    setOutcome(completeWorkout({ answers, dueIds: plan.dueIds }));
    afterActivity();
  };

  return <QuizSession items={plan.items} label="тренировка" onExit={goBack} onFinish={finish} />;
}
