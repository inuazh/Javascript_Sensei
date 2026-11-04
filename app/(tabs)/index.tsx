import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getDailyQuestion,
  getFirstUncompleted,
  getSectionLessons,
  getSections,
  getTopicLessons,
} from '../../src/content/repository';
import { dailyNumber, dailyStreak } from '../../src/domain/daily';
import { todayActivity } from '../../src/domain/progress';
import { plural } from '../../src/domain/reminders';
import { dueItems } from '../../src/domain/review';
import { viewStreak } from '../../src/domain/streak';
import { DailyShareButton } from '../../src/features/daily/DailyShare';
import { questionTitle } from '../../src/features/quiz/registry';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Button,
  Card,
  Chip,
  Colors,
  Fonts,
  Icon,
  type IconName,
  Label,
  Logo,
  ProgressBar,
  Screen,
  Spacing,
  Stars,
  Type,
} from '../../src/ui';

const pad = (n: number) => String(n).padStart(2, '0');

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.action}>
      <Icon name={icon} size={20} color={Colors.accent} />
      <View style={styles.flex}>
        <Text style={Type.h3}>{title}</Text>
        <Text style={Type.small}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </Card>
  );
}

function DailyCard({ today }: { today: string }) {
  const router = useRouter();
  const results = useUserStore(s => s.progress.daily);
  const question = useMemo(() => getDailyQuestion(today)?.question, [today]);
  if (!question) return null;

  const number = dailyNumber(today);
  const result = results[today];
  const streak = dailyStreak(results, today);
  const open = () => router.push('/daily');

  if (!result) {
    return (
      <Card style={styles.dailyCard}>
        <View style={styles.rowBetween}>
          <Label dot>задача дня</Label>
          <Text style={styles.dailyNumber}>#{number}</Text>
        </View>
        <Text style={Type.h3}>{questionTitle(question)}</Text>
        <Text style={Type.small}>
          Одна попытка, одна задача для всех.
          {streak > 0 ? ` Серия: ${streak}.` : ''}
        </Text>
        <Button
          title="Решить"
          icon="arrow-right"
          variant="secondary"
          onPress={open}
          accessibilityHint={`Задача дня номер ${number}, одна попытка`}
          style={styles.dailyButton}
        />
      </Card>
    );
  }

  const status = result.correct ? 'решена' : 'не решена';
  return (
    <Card style={styles.dailyCard}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Задача дня номер ${number} ${status}. Серия задач дня: ${streak}. Открыть результат`}
        style={styles.dailyDone}
      >
        <View style={[styles.dailyBadge, result.correct && styles.dailyBadgeSolved]}>
          <Icon
            name={result.correct ? 'check' : 'x'}
            size={18}
            color={result.correct ? Colors.textOnAccent : Colors.textSecondary}
          />
        </View>
        <View style={styles.flex}>
          <Text style={Type.h3}>
            Задача дня <Text style={styles.dailyInline}>#{number}</Text>
          </Text>
          <Text style={Type.small}>
            {result.correct ? 'Решено' : 'Не в этот раз'} · серия {streak} · завтра новая
          </Text>
        </View>
      </Pressable>
      <DailyShareButton
        results={results}
        day={today}
        variant="secondary"
        style={styles.dailyButton}
      />
    </Card>
  );
}

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
  const sections = getSections();
  const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;

  const streakLine =
    streak.status === 'done'
      ? `стрик ${days(streak.days)} · сегодня засчитан`
      : streak.status === 'pending'
        ? `пройди урок, чтобы сохранить стрик (${days(streak.days)})`
        : 'пройди урок и начни серию';

  return (
    <Screen>
      <View style={styles.header}>
        <Logo />
        <View style={styles.chips}>
          <Chip
            icon="flame"
            color={Colors.warning}
            label={String(streak.days)}
            muted={streak.status !== 'done'}
            accessibilityLabel={`Стрик: ${days(streak.days)}`}
          />
          <Chip
            icon="lightning"
            label={String(progress.totalXp)}
            accessibilityLabel={`Опыт: ${progress.totalXp} XP`}
          />
        </View>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Label>цель дня</Label>
          <Text style={styles.goalValue}>
            <Text style={{ color: goal >= 1 ? Colors.success : Colors.textPrimary }}>
              {Math.min(todayXp, dailyGoalXp)}
            </Text>
            <Text style={styles.goalTotal}>/{dailyGoalXp} xp</Text>
          </Text>
        </View>
        <ProgressBar
          value={goal}
          color={goal >= 1 ? Colors.success : Colors.accent}
          style={styles.goalBar}
        />
        <View style={styles.streakRow}>
          <Icon
            name={streak.status === 'pending' ? 'clock' : 'flame'}
            size={14}
            color={streak.status === 'pending' ? Colors.warning : Colors.textMuted}
          />
          <Text
            style={[styles.streakText, streak.status === 'pending' && { color: Colors.warning }]}
          >
            {streakLine}
          </Text>
        </View>
      </Card>

      {next ? (
        <Card style={styles.continueCard}>
          <Label dot>
            {Object.keys(progress.lessons).length === 0 ? 'начни отсюда' : 'продолжить'}
          </Label>
          <Text style={styles.continueMeta}>
            {pad(sections.findIndex(s => s.id === next.section.id) + 1)} · {next.section.title}
          </Text>
          <Text style={Type.h2}>{next.topic.title}</Text>
          <Text style={Type.small}>{next.lesson.title}</Text>
          <Button
            title="Начать урок"
            icon="arrow-right"
            onPress={() => router.push(`/lesson/${next.lesson.id}`)}
            style={styles.continueButton}
          />
        </Card>
      ) : (
        <Card tone="success">
          <Label>курс пройден</Label>
          <Text style={Type.h2}>Все уроки пройдены</Text>
          <Text style={Type.small}>
            Новые разделы на подходе. Пока закрепляй знания в тренировке.
          </Text>
        </Card>
      )}

      {showPlacement && (
        <ActionRow
          icon="compass"
          title="Уже знаешь основы?"
          subtitle="Вводный тест засчитает знакомые темы"
          onPress={() => router.push('/placement')}
        />
      )}
      <DailyCard today={today} />
      {dueCount > 0 && (
        <ActionRow
          icon="repeat"
          title="Пора повторить"
          subtitle={`${dueCount} ${plural(dueCount, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут')} повторения`}
          onPress={() => router.push('/review')}
        />
      )}

      <Label style={styles.mapTitle}>карта курса</Label>
      {sections.map((section, sIndex) => {
        const lessons = getSectionLessons(section.id);
        const done = lessons.filter(l => l.id in progress.lessons).length;
        return (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>{pad(sIndex + 1)}</Text>
              <Text style={[Type.h3, styles.flex]}>{section.title}</Text>
              <Text style={styles.count}>
                {done}/{lessons.length}
              </Text>
            </View>
            <ProgressBar value={lessons.length ? done / lessons.length : 0} height={3} />
            <View style={styles.topics}>
              {section.topics.map((topic, tIndex) => {
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
                      isNext && styles.topicNext,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.topicIndex, isNext && { color: Colors.accent }]}>
                      {sIndex + 1}.{tIndex + 1}
                    </Text>
                    <View style={styles.status}>
                      {isDone ? (
                        <Icon name="check" size={16} color={Colors.success} />
                      ) : isNext ? (
                        <Icon name="play" size={14} color={Colors.accent} />
                      ) : (
                        <View style={styles.dot} />
                      )}
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
                    </View>
                    {allSkipped ? (
                      <Text style={styles.count}>знакомо</Text>
                    ) : isDone && minStars > 0 ? (
                      <Stars count={minStars} size={12} />
                    ) : (
                      <Text style={styles.count}>
                        {completed.length}/{topicLessons.length}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalValue: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 34 },
  goalTotal: { color: Colors.textMuted },
  goalBar: { marginVertical: Spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  streakText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  continueCard: { gap: Spacing.xs, padding: Spacing.xl },
  continueMeta: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  continueButton: { marginTop: Spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyCard: { gap: Spacing.xs },
  dailyNumber: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30, color: Colors.accent },
  dailyInline: { fontFamily: Fonts.monoBold, color: Colors.accent },
  dailyButton: { marginTop: Spacing.md },
  dailyDone: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  dailyBadgeSolved: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  flex: { flex: 1 },
  mapTitle: { marginTop: Spacing.md },
  section: { gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  sectionNumber: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.accent },
  count: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  topics: { marginTop: Spacing.xs },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topicNext: { backgroundColor: Colors.surface },
  pressed: { backgroundColor: Colors.surfaceRaised },
  topicIndex: { width: 28, fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  status: { width: 16, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textDisabled },
  topicTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.textPrimary },
  topicSubtitle: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});
