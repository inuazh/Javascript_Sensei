import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { getDailyQuestion } from '../src/content/repository';
import type { Question } from '../src/content/schema';
import { dailyNumber } from '../src/domain/daily';
import { toDayKey } from '../src/domain/dates';
import type { DailyOutcome } from '../src/domain/progress';
import { DailyResultView } from '../src/features/daily/DailyResultView';
import { QuizSession } from '../src/features/quiz/QuizSession';
import type { QuizAnswer, QuizItem } from '../src/features/quiz/quizReducer';
import { afterActivity } from '../src/services/activity';
import { useUserStore } from '../src/stores/useUserStore';
import { Button, Screen, Type } from '../src/ui';
import { useGoBack } from '../src/hooks/useGoBack';

/** «Задача дня»: one question, one attempt, the same for everyone today. */
export default function DailyScreen() {
  const goBack = useGoBack();
  const completeDaily = useUserStore(s => s.completeDaily);
  const results = useUserStore(s => s.progress.daily);
  const [outcome, setOutcome] = useState<DailyOutcome | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Fix the day when the screen opens: an answer given after midnight still
  // belongs to the challenge that was shown.
  const day = useMemo(() => toDayKey(new Date()), []);
  const doneBefore = useMemo(() => day in useUserStore.getState().progress.daily, [day]);
  const found = useMemo(() => getDailyQuestion(day), [day]);
  const items: QuizItem<Question>[] = found
    ? [{ question: found.question, lessonId: found.lesson.id }]
    : [];

  if ((doneBefore || showResult) && results[day]) {
    return (
      <DailyResultView day={day} results={results} outcome={outcome ?? undefined} onDone={goBack} />
    );
  }

  if (!found) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>задачи на сегодня нет</Text>
        <Text style={Type.small}>загляни завтра.</Text>
        <Button title="назад" onPress={goBack} />
      </Screen>
    );
  }

  // The single attempt is saved the moment it is checked, so leaving the
  // explanation screen cannot be used to try again.
  const record = (answer: QuizAnswer) => {
    setOutcome(completeDaily({ day, ...answer }));
    afterActivity();
  };

  return (
    <QuizSession
      items={items}
      label={`задача дня #${dailyNumber(day)}`}
      onExit={goBack}
      onAnswer={record}
      onFinish={() => setShowResult(true)}
      confirmExitAfterAnswer={false}
    />
  );
}
