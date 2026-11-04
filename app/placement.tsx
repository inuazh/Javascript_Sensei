import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSections, getTopicLessons } from '../src/content/repository';
import type { Question } from '../src/content/schema';
import { passedTopics, planPlacement, shouldStopPlacement } from '../src/domain/placement';
import { plural } from '../src/domain/reminders';
import { QuizSession } from '../src/features/quiz/QuizSession';
import type { QuizAnswer } from '../src/features/quiz/quizReducer';
import { useUserStore } from '../src/stores/useUserStore';
import { Button, Card, Colors, Screen, Spacing, Type } from '../src/ui';

type Phase = 'intro' | 'quiz' | 'result';

/** Placement test: marks topics the learner already knows as done. */
export default function PlacementScreen() {
  const router = useRouter();
  const applyPlacement = useUserStore(s => s.applyPlacement);
  const updateSettings = useUserStore(s => s.updateSettings);
  const [phase, setPhase] = useState<Phase>('intro');
  const [passed, setPassed] = useState<string[]>([]);

  const items = useMemo(
    () =>
      planPlacement<Question>(
        getSections().flatMap(section =>
          section.topics.map(topic => ({
            topicId: topic.id,
            lessons: getTopicLessons(topic.id),
          })),
        ),
      ),
    [],
  );
  const topicTitles = useMemo(
    () => new Map(getSections().flatMap(s => s.topics.map(t => [t.id, t.title] as const))),
    [],
  );

  const leave = () => router.replace('/(tabs)');
  const decline = () => {
    updateSettings({ placementDone: true });
    leave();
  };

  if (phase === 'intro') {
    return (
      <Screen
        edges={['top', 'bottom']}
        contentStyle={styles.center}
        footer={
          <View style={styles.footer}>
            <Button title="Пройти тест" onPress={() => setPhase('quiz')} />
            <Button title="Начать с первого урока" variant="ghost" onPress={decline} />
          </View>
        }
      >
        <Text style={styles.emoji}>🧭</Text>
        <Text style={[Type.h1, styles.text]}>Вводный тест</Text>
        <Text style={[Type.body, styles.text, styles.muted]}>
          По одному вопросу на тему. Темы, где ответишь верно, засчитаются, и ты начнёшь с того,
          чего ещё не знаешь. Займёт пару минут — тест закончится сам, если вопросы станут слишком
          сложными.
        </Text>
        <Text style={[Type.small, styles.text]}>
          Засчитанные темы можно пройти позже — за них тоже дадут XP.
        </Text>
      </Screen>
    );
  }

  if (phase === 'result') {
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={
          <View style={styles.footer}>
            <Button title="К урокам →" onPress={leave} />
          </View>
        }
      >
        <Text style={[styles.emoji, styles.text]}>{passed.length > 0 ? '🎯' : '🌱'}</Text>
        <Text style={[Type.h1, styles.text]}>
          {passed.length > 0
            ? `Засчитано ${passed.length} ${plural(passed.length, 'тема', 'темы', 'тем')}`
            : 'Начнём с основ'}
        </Text>
        <Text style={[Type.small, styles.text]}>
          {passed.length > 0
            ? 'Эти темы отмечены как знакомые. Курс продолжится с первой незнакомой.'
            : 'Ничего страшного: основы быстро пролетят, а повторения закрепят знания.'}
        </Text>
        {passed.map(topicId => (
          <Card key={topicId} color={Colors.green} style={styles.row}>
            <Text style={Type.h3}>✓ {topicTitles.get(topicId)}</Text>
          </Card>
        ))}
      </Screen>
    );
  }

  const finish = (answers: QuizAnswer[]) => {
    const topics = passedTopics(items, answers);
    const lessonIds = topics.flatMap(t => getTopicLessons(t).map(l => l.id));
    applyPlacement(lessonIds);
    setPassed(topics);
    setPhase('result');
  };

  return (
    <QuizSession
      items={items.map(i => ({ question: i.question, lessonId: i.lessonId }))}
      label="Вводный тест"
      color={Colors.blue}
      onExit={decline}
      onFinish={finish}
      shouldStop={shouldStopPlacement}
    />
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  emoji: { fontSize: 64, textAlign: 'center' },
  text: { textAlign: 'center' },
  muted: { color: Colors.textSecondary },
  row: { paddingVertical: Spacing.md },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
