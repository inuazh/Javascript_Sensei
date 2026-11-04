import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSectionLessons, getSections } from '../src/content/repository';
import type { Question } from '../src/content/schema';
import {
  PLACEMENT_MINUTES,
  passedUnits,
  planPlacement,
  shouldStopPlacement,
} from '../src/domain/placement';
import { plural } from '../src/domain/reminders';
import { QuizSession } from '../src/features/quiz/QuizSession';
import type { QuizAnswer } from '../src/features/quiz/quizReducer';
import { useUserStore } from '../src/stores/useUserStore';
import { Button, Colors, Fonts, Icon, Radius, Screen, Spacing, Type } from '../src/ui';

type Phase = 'intro' | 'quiz' | 'result';

/** Placement test: marks sections the learner already knows as done. */
export default function PlacementScreen() {
  const router = useRouter();
  // Onboarding already explained the test, so it starts right away from there.
  const { start } = useLocalSearchParams<{ start?: string }>();
  const applyPlacement = useUserStore(s => s.applyPlacement);
  const updateSettings = useUserStore(s => s.updateSettings);
  const [phase, setPhase] = useState<Phase>(start === '1' ? 'quiz' : 'intro');
  const [passed, setPassed] = useState<string[]>([]);

  const items = useMemo(
    () =>
      planPlacement<Question>(
        getSections().map(section => ({ id: section.id, lessons: getSectionLessons(section.id) })),
      ),
    [],
  );
  const sectionTitles = useMemo(() => new Map(getSections().map(s => [s.id, s.title])), []);

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
            <Button title="Пройти тест" icon="arrow-right" onPress={() => setPhase('quiz')} />
            <Button title="Начать с первого урока" variant="ghost" onPress={decline} />
          </View>
        }
      >
        <View style={styles.iconBox}>
          <Icon name="compass" size={32} color={Colors.accent} />
        </View>
        <Text style={Type.h1}>Вводный тест</Text>
        <Text style={[Type.body, styles.muted]}>
          {`${items.length} ${plural(items.length, 'вопрос', 'вопроса', 'вопросов')}, по одному на раздел. Займёт около ${PLACEMENT_MINUTES} минут.`}
        </Text>
        <Text style={[Type.body, styles.muted]}>
          Ответишь верно — раздел засчитается, и ты начнёшь с того, чего ещё не знаешь.
        </Text>
        <Text style={Type.small}>
          Засчитанные разделы можно пройти позже — за них тоже дадут XP.
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
            <Button title="К урокам" icon="arrow-right" onPress={leave} />
          </View>
        }
      >
        <Text style={styles.score}>{`${passed.length}/${items.length}`}</Text>
        <Text style={Type.h1}>
          {passed.length > 0
            ? `${plural(passed.length, 'Засчитан', 'Засчитаны', 'Засчитано')} ${passed.length} ${plural(passed.length, 'раздел', 'раздела', 'разделов')}`
            : 'Начнём с основ'}
        </Text>
        <Text style={Type.small}>
          {passed.length > 0
            ? 'Эти разделы отмечены как знакомые. Курс продолжится с первого незнакомого.'
            : 'Ничего страшного: основы быстро пролетят, а повторения закрепят знания.'}
        </Text>
        {passed.map(sectionId => (
          <View key={sectionId} style={styles.row}>
            <Icon name="check" size={16} color={Colors.success} />
            <Text style={Type.h3}>{sectionTitles.get(sectionId)}</Text>
          </View>
        ))}
      </Screen>
    );
  }

  const finish = (answers: QuizAnswer[]) => {
    const sections = passedUnits(items, answers);
    const lessonIds = sections.flatMap(id => getSectionLessons(id).map(l => l.id));
    applyPlacement(lessonIds);
    setPassed(sections);
    setPhase('result');
  };

  return (
    <QuizSession
      items={items.map(i => ({ question: i.question, lessonId: i.lessonId }))}
      label="Вводный тест"
      onExit={decline}
      onFinish={finish}
      shouldStop={shouldStopPlacement}
    />
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: { color: Colors.textSecondary },
  score: {
    fontFamily: Fonts.display,
    fontSize: 72,
    lineHeight: 80,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
