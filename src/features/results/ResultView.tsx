import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { ActivityOutcome } from '../../domain/progress';
import { getLevelInfo } from '../../domain/levels';
import { plural } from '../../domain/reminders';
import { useFeedback } from '../../services/feedback';
import {
  Button,
  Card,
  Colors,
  Fonts,
  Icon,
  type IconName,
  Label,
  ProgressBar,
  Screen,
  Spacing,
  Stars,
  Type,
} from '../../ui';

interface ResultViewProps {
  /** Big score line, e.g. "5/5". */
  score: string;
  title: string;
  subtitle: string;
  stars?: number;
  outcome: ActivityOutcome;
  totalXp: number;
  primary: { title: string; onPress: () => void };
  secondary?: { title: string; onPress: () => void };
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: Colors.accent }]}>{value}</Text>
    </View>
  );
}

export function ResultView({
  score,
  title,
  subtitle,
  stars,
  outcome,
  totalXp,
  primary,
  secondary,
}: ResultViewProps) {
  const appear = useRef(new Animated.Value(0)).current;
  const feedback = useFeedback();
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    feedback.celebrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const level = getLevelInfo(totalXp);
  const levelUp = outcome.levelAfter > outcome.levelBefore;
  const goalProgress = outcome.todayXpAfter / outcome.dailyGoalXp;
  const xp = outcome.xpEarned + outcome.achievementXp;

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button title={primary.title} icon="arrow-right" onPress={primary.onPress} />
          {secondary ? (
            <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
          ) : null}
        </View>
      }
    >
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: appear,
            transform: [
              { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}
      >
        <Text style={styles.score}>{score}</Text>
        <Text style={Type.h2}>{title}</Text>
        <Text style={[Type.small, styles.center]}>{subtitle}</Text>
        {stars !== undefined && <Stars count={stars} size={26} />}
      </Animated.View>

      <Card>
        <Row label="XP" value={xp > 0 ? `+${xp}` : '0'} accent={xp > 0} />
        {outcome.streakExtended && (
          <Row
            label="стрик"
            value={`${outcome.streakDays} ${plural(outcome.streakDays, 'день', 'дня', 'дней')}`}
          />
        )}
        {outcome.freezesEarned > 0 && <Row label="заморозка" value="+1" accent />}
        <Row label="уровень" value={`${level.level} · ${level.title}`} accent={levelUp} />
        <View style={styles.goalHead}>
          <Text style={styles.rowLabel}>цель дня</Text>
          <Text style={styles.rowValue}>
            {Math.min(outcome.todayXpAfter, outcome.dailyGoalXp)}/{outcome.dailyGoalXp}
          </Text>
        </View>
        <ProgressBar
          value={goalProgress}
          color={goalProgress >= 1 ? Colors.success : Colors.accent}
        />
      </Card>

      {xp === 0 && (
        <Text style={[Type.small, styles.center]}>
          XP дают за новый материал и улучшение результата. повторение тоже полезно.
        </Text>
      )}

      {outcome.achievements.length > 0 && <Label>новые достижения</Label>}
      {outcome.achievements.map(a => (
        <Card key={a.id} tone="accent" style={styles.achievement}>
          <Icon name={a.icon as IconName} size={24} color={Colors.accent} />
          <View style={styles.flex}>
            <Text style={Type.h3}>{a.title}</Text>
            <Text style={Type.small}>{a.description}</Text>
          </View>
          {a.xpReward > 0 && <Text style={styles.reward}>+{a.xpReward}</Text>}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxxl },
  hero: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  score: {
    fontFamily: Fonts.display,
    fontSize: 96,
    lineHeight: 104,
    color: Colors.textPrimary,
  },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.textMuted },
  rowValue: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.textPrimary },
  goalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: Spacing.sm,
  },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  reward: { fontFamily: Fonts.monoBold, color: Colors.accent },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
