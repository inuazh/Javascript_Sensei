import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getFirstUncompleted,
  getSectionLessons,
  getSections,
  getTopicLessons,
} from '../../src/content/repository';
import { todayActivity } from '../../src/domain/progress';
import { plural } from '../../src/domain/reminders';
import { dueItems } from '../../src/domain/review';
import { viewStreak } from '../../src/domain/streak';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Button,
  Card,
  Chip,
  Colors,
  ProgressBar,
  Radius,
  Screen,
  Spacing,
  Stars,
  Type,
  alpha,
  getSectionColor,
} from '../../src/ui';

export default function HomeScreen() {
  const router = useRouter();
  const today = useToday();
  const progress = useUserStore(s => s.progress);
  const dailyGoalXp = useUserStore(s => s.settings.dailyGoalXp);
  const showPlacement = useUserStore(
    s =>
      !s.settings.placementDone &&
      s.settings.experience !== 'beginner' &&
      Object.keys(s.progress.lessons).length === 0,
  );

  const streak = viewStreak(progress.streak, today);
  const todayXp = todayActivity(progress, today).xp;
  const goal = Math.min(1, todayXp / dailyGoalXp);
  const dueCount = dueItems(progress.review, today).length;
  const next = useMemo(() => getFirstUncompleted(id => id in progress.lessons), [progress.lessons]);

  const streakLine =
    streak.status === 'done'
      ? `🔥 Стрик: ${streak.days} ${plural(streak.days, 'день', 'дня', 'дней')} — сегодня засчитан`
      : streak.status === 'pending'
        ? `⏳ Пройди урок, чтобы не потерять стрик (${streak.days} ${plural(streak.days, 'день', 'дня', 'дней')})`
        : '✨ Пройди урок и начни серию';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ JS Sensei</Text>
        <View style={styles.chips}>
          <Chip
            icon="🔥"
            color={Colors.orange}
            label={String(streak.days)}
            muted={streak.status !== 'done'}
          />
          <Chip icon="⚡" label={String(progress.totalXp)} />
        </View>
      </View>

      <Card color={goal >= 1 ? Colors.green : undefined}>
        <View style={styles.rowBetween}>
          <Text style={Type.h3}>{goal >= 1 ? '🎯 Цель дня выполнена!' : '🎯 Цель дня'}</Text>
          <Text style={styles.mono}>
            {Math.min(todayXp, dailyGoalXp)}/{dailyGoalXp} XP
          </Text>
        </View>
        <ProgressBar
          value={goal}
          color={goal >= 1 ? Colors.green : Colors.yellow}
          style={styles.goalBar}
        />
        <Text style={[Type.small, streak.status === 'pending' && { color: Colors.orange }]}>
          {streakLine}
        </Text>
      </Card>

      {next ? (
        <Card color={getSectionColor(next.section)} style={styles.continueCard}>
          <Text style={[Type.caption, { color: getSectionColor(next.section) }]}>
            {Object.keys(progress.lessons).length === 0 ? 'Начни отсюда' : 'Продолжить'} ·{' '}
            {next.section.title}
          </Text>
          <Text style={Type.h2}>{next.topic.title}</Text>
          <Text style={Type.small}>
            {next.lesson.title}
            {next.lesson.theory ? ' · 📖 с теорией' : ''}
          </Text>
          <Button
            title="Начать урок →"
            color={getSectionColor(next.section)}
            onPress={() => router.push(`/lesson/${next.lesson.id}`)}
            style={styles.continueButton}
          />
        </Card>
      ) : (
        <Card color={Colors.yellow}>
          <Text style={Type.h2}>🏆 Курс пройден!</Text>
          <Text style={Type.small}>
            Новые разделы уже в работе. А пока — закрепляй знания в тренировке.
          </Text>
        </Card>
      )}

      {showPlacement && (
        <Card
          color={Colors.blue}
          onPress={() => router.push('/placement')}
          style={styles.reviewCard}
        >
          <Text style={styles.reviewIcon}>🧭</Text>
          <View style={styles.flex}>
            <Text style={Type.h3}>Уже знаешь основы?</Text>
            <Text style={Type.small}>Пройди вводный тест и пропусти знакомые темы</Text>
          </View>
          <Text style={[styles.arrow, { color: Colors.blue }]}>→</Text>
        </Card>
      )}

      {dueCount > 0 && (
        <Card color={Colors.pink} onPress={() => router.push('/review')} style={styles.reviewCard}>
          <Text style={styles.reviewIcon}>🧠</Text>
          <View style={styles.flex}>
            <Text style={Type.h3}>Пора повторить</Text>
            <Text style={Type.small}>
              {dueCount} {plural(dueCount, 'вопрос', 'вопроса', 'вопросов')} ждут повторения
            </Text>
          </View>
          <Text style={[styles.arrow, { color: Colors.pink }]}>→</Text>
        </Card>
      )}

      <Text style={[Type.caption, styles.mapTitle]}>Карта курса</Text>
      {getSections().map(section => {
        const color = getSectionColor(section);
        const lessons = getSectionLessons(section.id);
        const done = lessons.filter(l => l.id in progress.lessons).length;
        return (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: alpha(color, 0.12) }]}>
                <Text style={styles.sectionEmoji}>{section.icon}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={Type.h3}>{section.title}</Text>
                <Text style={Type.small}>
                  {done}/{lessons.length} уроков
                </Text>
              </View>
            </View>
            <ProgressBar
              value={lessons.length ? done / lessons.length : 0}
              color={color}
              height={6}
            />
            {section.topics.map(topic => {
              const topicLessons = getTopicLessons(topic.id);
              const completed = topicLessons.filter(l => l.id in progress.lessons);
              const isDone = completed.length === topicLessons.length && topicLessons.length > 0;
              const isNext = next?.topic.id === topic.id;
              const taken = completed.filter(l => !progress.lessons[l.id].skipped);
              const allSkipped = isDone && taken.length === 0;
              const minStars =
                isDone && taken.length === completed.length
                  ? Math.min(...taken.map(l => progress.lessons[l.id].stars))
                  : 0;
              return (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${topic.title}, пройдено ${completed.length} из ${topicLessons.length}`}
                  onPress={() => router.push(`/topic/${topic.id}`)}
                  style={({ pressed }) => [
                    styles.topic,
                    isNext && {
                      borderColor: alpha(color, 0.45),
                      backgroundColor: alpha(color, 0.06),
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.topicBadge,
                      {
                        backgroundColor: isDone ? alpha(color, 0.2) : 'rgba(255,255,255,0.04)',
                        borderColor: alpha(color, isDone || isNext ? 0.6 : 0.2),
                      },
                    ]}
                  >
                    <Text style={[styles.topicBadgeText, { color }]}>
                      {isDone ? '✓' : isNext ? '▶' : `${completed.length}`}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={Type.small}>{topic.subtitle}</Text>
                  </View>
                  {allSkipped ? (
                    <Text style={styles.topicCount}>знакомо</Text>
                  ) : isDone && minStars > 0 ? (
                    <Stars count={minStars} size={11} />
                  ) : (
                    <Text style={styles.topicCount}>
                      {completed.length}/{topicLessons.length}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 22, fontWeight: '900', color: Colors.yellow, letterSpacing: -0.5 },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mono: { fontWeight: '800', color: Colors.textSecondary },
  goalBar: { marginVertical: Spacing.md },
  continueCard: { gap: Spacing.xs, padding: Spacing.xl },
  continueButton: { marginTop: Spacing.md },
  reviewCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reviewIcon: { fontSize: 28 },
  arrow: { fontSize: 22, fontWeight: '800' },
  flex: { flex: 1 },
  mapTitle: { marginTop: Spacing.sm },
  section: { gap: Spacing.sm, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmoji: { fontSize: 22 },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.7 },
  topicBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicBadgeText: { fontWeight: '800', fontSize: 15 },
  topicTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  topicCount: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
});
