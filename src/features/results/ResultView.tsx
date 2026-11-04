import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { ActivityOutcome } from '../../domain/progress';
import { getLevelInfo } from '../../domain/levels';
import { plural } from '../../domain/reminders';
import { useFeedback } from '../../services/feedback';
import {
  Button,
  Card,
  Chip,
  Colors,
  ProgressBar,
  Screen,
  Spacing,
  Stars,
  Type,
  alpha,
} from '../../ui';

interface ResultViewProps {
  emoji: string;
  title: string;
  subtitle: string;
  stars?: number;
  outcome: ActivityOutcome;
  totalXp: number;
  primary: { title: string; onPress: () => void };
  secondary?: { title: string; onPress: () => void };
}

export function ResultView({
  emoji,
  title,
  subtitle,
  stars,
  outcome,
  totalXp,
  primary,
  secondary,
}: ResultViewProps) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const feedback = useFeedback();
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    feedback.celebrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const level = getLevelInfo(totalXp);
  const levelUp = outcome.levelAfter > outcome.levelBefore;
  const goalProgress = outcome.todayXpAfter / outcome.dailyGoalXp;

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button title={primary.title} onPress={primary.onPress} />
          {secondary ? (
            <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
          ) : null}
        </View>
      }
    >
      <Animated.Text style={[styles.emoji, { transform: [{ scale }] }]}>{emoji}</Animated.Text>
      <Text style={[Type.h1, styles.center]}>{title}</Text>
      <Text style={[Type.small, styles.center]}>{subtitle}</Text>
      {stars !== undefined && (
        <View style={styles.center}>
          <Stars count={stars} size={30} />
        </View>
      )}

      <View style={styles.chips}>
        <Chip
          icon="⚡"
          label={`+${outcome.xpEarned + outcome.achievementXp} XP`}
          muted={outcome.xpEarned + outcome.achievementXp === 0}
        />
        {outcome.streakExtended && (
          <Chip
            icon="🔥"
            color={Colors.orange}
            label={`${outcome.streakDays} ${plural(outcome.streakDays, 'день', 'дня', 'дней')}`}
          />
        )}
        {outcome.freezesEarned > 0 && <Chip icon="🧊" color={Colors.blue} label="+1 заморозка" />}
      </View>

      {outcome.xpEarned === 0 && outcome.achievementXp === 0 && (
        <Text style={[Type.small, styles.center]}>
          XP начисляется за новый материал и улучшение результата. Повторение без ошибок — тоже
          польза!
        </Text>
      )}

      <Card color={outcome.goalReached || goalProgress >= 1 ? Colors.green : undefined}>
        <View style={styles.rowBetween}>
          <Text style={Type.h3}>{goalProgress >= 1 ? '🎯 Цель дня выполнена' : '🎯 Цель дня'}</Text>
          <Text style={styles.mono}>
            {Math.min(outcome.todayXpAfter, outcome.dailyGoalXp)}/{outcome.dailyGoalXp} XP
          </Text>
        </View>
        <ProgressBar
          value={goalProgress}
          color={goalProgress >= 1 ? Colors.green : Colors.yellow}
          style={styles.bar}
        />
      </Card>

      {levelUp && (
        <Card color={Colors.purple}>
          <Text style={Type.h3}>🚀 Новый уровень: {level.level}</Text>
          <Text style={Type.small}>Звание: {level.title}</Text>
        </Card>
      )}

      {outcome.achievements.map(a => (
        <Card key={a.id} color={Colors.yellow} style={styles.achievement}>
          <Text style={styles.achievementIcon}>{a.icon}</Text>
          <View style={styles.flex}>
            <Text style={Type.h3}>{a.title}</Text>
            <Text style={Type.small}>{a.description}</Text>
          </View>
          {a.xpReward > 0 && (
            <Text style={[styles.mono, { color: Colors.yellow }]}>+{a.xpReward}</Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxxl },
  emoji: { fontSize: 72, textAlign: 'center' },
  center: { textAlign: 'center', alignItems: 'center' },
  chips: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mono: { fontWeight: '800', color: Colors.textSecondary },
  bar: { marginTop: Spacing.md },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: alpha(Colors.yellow, 0.08),
  },
  achievementIcon: { fontSize: 30 },
  flex: { flex: 1 },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
