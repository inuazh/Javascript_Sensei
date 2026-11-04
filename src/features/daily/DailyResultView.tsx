import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  dailyHistory,
  dailyNumber,
  dailyStreak,
  type DailyMark,
  type DailyResults,
} from '../../domain/daily';
import type { DayKey } from '../../domain/dates';
import type { DailyOutcome } from '../../domain/progress';
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
  Radius,
  Screen,
  Spacing,
  Type,
} from '../../ui';
import { DailyShareButton } from './DailyShare';

interface DailyResultViewProps {
  day: DayKey;
  results: DailyResults;
  /** Present right after answering; absent when the finished challenge is reopened. */
  outcome?: DailyOutcome;
  onDone: () => void;
}

const MARK_LABEL: Record<DailyMark, string> = {
  solved: 'решена',
  failed: 'не решена',
  missed: 'пропущена',
};

function History({ marks }: { marks: DailyMark[] }) {
  const description = marks.map(m => MARK_LABEL[m]).join(', ');
  return (
    <View
      style={styles.history}
      accessible
      accessibilityLabel={`Последние задачи дня: ${description}`}
    >
      {marks.map((mark, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            mark === 'solved' && styles.cellSolved,
            mark === 'failed' && styles.cellFailed,
          ]}
        />
      ))}
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: Colors.accent }]}>{value}</Text>
    </View>
  );
}

export function DailyResultView({ day, results, outcome, onDone }: DailyResultViewProps) {
  const appear = useRef(new Animated.Value(0)).current;
  const feedback = useFeedback();
  const result = results[day];
  const correct = !!result?.correct;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    if (outcome?.correct) feedback.celebrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const number = dailyNumber(day);
  const streak = dailyStreak(results, day);
  const xp = outcome ? outcome.xpEarned + outcome.achievementXp : 0;
  const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <DailyShareButton results={results} day={day} />
          <Button title="Готово" variant="ghost" onPress={onDone} />
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
        <Label dot>задача дня</Label>
        <Text style={styles.number} accessibilityLabel={`Задача дня номер ${number}`}>
          #{number}
        </Text>
        <View
          style={[styles.badge, correct ? styles.badgeSolved : styles.badgeFailed]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon
            name={correct ? 'check' : 'x'}
            size={26}
            color={correct ? Colors.textOnAccent : Colors.textSecondary}
          />
        </View>
        <Text style={Type.h2} accessibilityRole="header">
          {correct ? 'Решено' : 'Не в этот раз'}
        </Text>
        <Text style={[Type.small, styles.center]}>
          {correct
            ? 'С первой попытки. Завтра — новая задача.'
            : 'Вопрос добавлен в повторение. Завтра — новая задача.'}
        </Text>
      </Animated.View>

      <Card>
        <History marks={dailyHistory(results, day)} />
        <Row label="серия задач дня" value={String(streak)} accent={streak > 0} />
        {outcome && <Row label="xp" value={xp > 0 ? `+${xp}` : '0'} accent={xp > 0} />}
        {outcome?.streakExtended && <Row label="стрик" value={days(outcome.streakDays)} />}
        {outcome && outcome.freezesEarned > 0 && <Row label="заморозка" value="+1" accent />}
      </Card>

      {outcome && outcome.achievements.length > 0 && <Label>новые достижения</Label>}
      {outcome?.achievements.map(a => (
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

const CELL = 14;

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxxl },
  hero: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  number: { fontFamily: Fonts.display, fontSize: 88, lineHeight: 96, color: Colors.textPrimary },
  badge: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeSolved: { backgroundColor: Colors.accent },
  badgeFailed: { borderWidth: 1, borderColor: Colors.borderStrong },
  center: { textAlign: 'center' },
  history: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  cell: { width: CELL, height: CELL, borderRadius: 3, backgroundColor: Colors.dotOff },
  cellSolved: { backgroundColor: Colors.accent },
  cellFailed: { backgroundColor: Colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.textMuted },
  rowValue: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.textPrimary },
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
