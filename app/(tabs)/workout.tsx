import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getQuestion } from '../../src/content/repository';
import { plural } from '../../src/domain/reminders';
import { dueItems, weakItems } from '../../src/domain/review';
import { XP } from '../../src/domain/rewards';
import { questionPreview } from '../../src/features/quiz/registry';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import { Button, Card, Chip, Colors, Fonts, Screen, Spacing, Type } from '../../src/ui';

export default function WorkoutTab() {
  const router = useRouter();
  const today = useToday();
  const progress = useUserStore(s => s.progress);
  const due = dueItems(progress.review, today);
  const weak = weakItems(progress.review, 5);
  const hasItems = Object.keys(progress.review).length > 0;
  const doneToday = progress.lastWorkoutDay === today;

  return (
    <Screen>
      <Text style={Type.h1}>Тренировка</Text>
      <Text style={Type.small}>
        Вопросы из пройденных уроков возвращаются через 2, 4, 8, 16 и 32 дня — так знания переходят
        в долгую память. Ошибки повторяются в первую очередь.
      </Text>

      <Card color={Colors.pink} style={styles.hero}>
        <Text style={styles.heroIcon}>🧠</Text>
        {hasItems ? (
          <>
            <Text style={Type.h2}>
              {due.length > 0
                ? `${due.length} ${plural(due.length, 'вопрос', 'вопроса', 'вопросов')} на повторение`
                : 'Всё повторено!'}
            </Text>
            <Text style={[Type.small, styles.center]}>
              {due.length > 0
                ? `+${XP.perCorrectReview} XP за каждый верный ответ${doneToday ? '' : ` и +${XP.dailyWorkoutBonus} XP за первую тренировку дня`}`
                : 'Можно потренироваться на самых свежих вопросах — без XP, зато с пользой.'}
            </Text>
            <Button
              title={due.length > 0 ? 'Начать тренировку' : 'Свободная практика'}
              color={Colors.pink}
              variant={due.length > 0 ? 'primary' : 'secondary'}
              onPress={() => router.push('/review')}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={Type.h2}>Здесь будут повторения</Text>
            <Text style={[Type.small, styles.center]}>
              Пройди первый урок — его вопросы появятся в тренировке.
            </Text>
            <Button
              title="К урокам"
              variant="secondary"
              color={Colors.pink}
              onPress={() => router.push('/')}
              style={styles.button}
            />
          </>
        )}
      </Card>

      <View style={styles.stats}>
        <Chip icon="🛠️" color={Colors.green} label={`исправлено: ${progress.mistakesFixed}`} />
        <Chip icon="🏋️" color={Colors.blue} label={`тренировок: ${progress.workoutsCompleted}`} />
      </View>

      {weak.length > 0 && (
        <>
          <Text style={[Type.caption, styles.mt]}>Слабые места</Text>
          {weak.map(item => {
            const found = getQuestion(item.questionId);
            if (!found) return null;
            return (
              <Card key={item.questionId} style={styles.weak}>
                <View style={styles.flex}>
                  <Text style={styles.weakTitle}>{found.lesson.title}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {questionPreview(found.question)}
                  </Text>
                </View>
                <Chip icon="✗" color={Colors.red} label={String(item.lapses)} />
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
  heroIcon: { fontSize: 48 },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: Spacing.md },
  stats: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  mt: { marginTop: Spacing.sm },
  weak: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  flex: { flex: 1 },
  weakTitle: { fontWeight: '700', color: Colors.textPrimary },
  preview: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
