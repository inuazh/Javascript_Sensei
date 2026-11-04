import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { getContentLookup, getQuestion, questionExists } from '../../src/content/repository';
import { plural } from '../../src/domain/reminders';
import { BOX_INTERVALS, MAX_BOX, dueItems, weakItems } from '../../src/domain/review';
import { XP } from '../../src/domain/rewards';
import { placeOf } from '../../src/domain/stats';
import { questionPreview } from '../../src/features/quiz/registry';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Button,
  Card,
  Colors,
  Fonts,
  Icon,
  Label,
  Screen,
  Spacing,
  Stat,
  StatRow,
  Type,
  pad2,
} from '../../src/ui';

export default function WorkoutTab() {
  const router = useRouter();
  const today = useToday();
  const { review, lastWorkoutDay, mistakesFixed, workoutsCompleted } = useUserStore(
    useShallow(s => ({
      review: s.progress.review,
      lastWorkoutDay: s.progress.lastWorkoutDay,
      mistakesFixed: s.progress.mistakesFixed,
      workoutsCompleted: s.progress.workoutsCompleted,
    })),
  );
  const due = useMemo(() => dueItems(review, today, questionExists), [review, today]);
  const weak = useMemo(() => weakItems(review, 5, questionExists), [review]);
  const total = useMemo(
    () => Object.values(review).filter(i => questionExists(i.questionId)).length,
    [review],
  );
  const doneToday = lastWorkoutDay === today;

  return (
    <Screen>
      <Text style={Type.h1}>тренировка</Text>
      <Text style={Type.small}>
        вопросы из пройденных уроков возвращаются через {BOX_INTERVALS.slice(1).join(', ')}{' '}
        {plural(BOX_INTERVALS[MAX_BOX], 'день', 'дня', 'дней')}. ошибки идут в первую очередь
      </Text>

      <Card style={styles.hero}>
        <Label dot={due.length > 0}>{total > 0 ? 'на сегодня' : 'пока пусто'}</Label>
        {total > 0 ? (
          <>
            <Text style={styles.big}>{due.length}</Text>
            <Text style={Type.h3}>
              {due.length > 0
                ? `${plural(due.length, 'вопрос', 'вопроса', 'вопросов')} на повторение`
                : 'всё повторено'}
            </Text>
            <Text style={Type.small}>
              {due.length > 0
                ? `+${XP.perCorrectReview} XP за верный ответ${doneToday ? '' : `, +${XP.dailyWorkoutBonus} XP за первую тренировку дня`}`
                : 'можно потренироваться на свежих вопросах: без XP, но с пользой'}
            </Text>
            <Button
              title={due.length > 0 ? 'начать тренировку' : 'свободная практика'}
              icon="arrow-right"
              variant={due.length > 0 ? 'primary' : 'secondary'}
              onPress={() => router.push('/review')}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={Type.h3}>здесь будут повторения</Text>
            <Text style={Type.small}>пройди первый урок, и его вопросы появятся в тренировке</Text>
            <Button
              title="к урокам"
              variant="secondary"
              onPress={() => router.push('/')}
              style={styles.button}
            />
          </>
        )}
      </Card>

      <StatRow>
        <Stat value={total} label="в колоде" />
        <Stat value={mistakesFixed} label="исправлено" />
        <Stat value={workoutsCompleted} label="тренировок" />
      </StatRow>

      {weak.length > 0 && (
        <>
          <Label style={styles.mt}>слабые места</Label>
          {weak.map(item => {
            const found = getQuestion(item.questionId);
            if (!found) return null;
            const place = placeOf(getContentLookup(), item);
            return (
              <View
                key={item.questionId}
                accessible
                accessibilityLabel={`${place ? `раздел «${place.sectionTitle}», ` : ''}урок «${found.lesson.title}»: ${questionPreview(found.question)}. ошибок: ${item.lapses}`}
                style={styles.weak}
              >
                <View style={styles.flex}>
                  {place && (
                    <Text style={styles.section} numberOfLines={1}>
                      {pad2(place.sectionNumber)} · {place.sectionTitle}
                    </Text>
                  )}
                  <Text style={styles.weakTitle}>{found.lesson.title}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {questionPreview(found.question)}
                  </Text>
                </View>
                <View style={styles.lapses}>
                  <Icon name="x" size={12} color={Colors.danger} />
                  <Text style={styles.lapsesText}>{item.lapses}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.xs, padding: Spacing.xl },
  big: {
    fontFamily: Fonts.display,
    fontSize: 80,
    lineHeight: 88,
    color: Colors.textPrimary,
  },
  button: { marginTop: Spacing.md },
  mt: { marginTop: Spacing.sm },
  weak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  flex: { flex: 1 },
  section: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  weakTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  preview: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lapses: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lapsesText: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.danger },
});
