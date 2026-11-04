import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { ACHIEVEMENTS } from '../../src/domain/achievements';
import { addDays, weekStart } from '../../src/domain/dates';
import { getLevelInfo } from '../../src/domain/levels';
import { viewStreak } from '../../src/domain/streak';
import { SectionStatsCard } from '../../src/features/stats/SectionStatsCard';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Card,
  Colors,
  Fonts,
  Icon,
  type IconName,
  Label,
  ProgressBar,
  Radius,
  Screen,
  Spacing,
  Stat,
  StatRow,
  Type,
  alpha,
} from '../../src/ui';

const HEATMAP_WEEKS = 15;
const DAY_LABELS = ['пн', '', 'ср', '', 'пт', '', 'вс'];

function intensity(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 30) return 0.25;
  if (xp < 80) return 0.5;
  if (xp < 150) return 0.75;
  return 1;
}

export default function ProfileScreen() {
  const router = useRouter();
  const today = useToday();
  // Only the slices shown here: a finished daily or workout does not re-render the profile
  // unless it changes one of them.
  const progress = useUserStore(
    useShallow(s => ({
      totalXp: s.progress.totalXp,
      streak: s.progress.streak,
      lessons: s.progress.lessons,
      activity: s.progress.activity,
      achievements: s.progress.achievements,
      review: s.progress.review,
    })),
  );
  const nickname = useUserStore(s => s.settings.nickname);
  const level = getLevelInfo(progress.totalXp);
  const streak = viewStreak(progress.streak, today);
  const lessons = Object.values(progress.lessons).filter(l => !l.skipped);
  const initial = nickname ? nickname.charAt(0).toUpperCase() : String(level.level);

  const weeks = useMemo(() => {
    const start = addDays(weekStart(today), -7 * (HEATMAP_WEEKS - 1));
    return Array.from({ length: HEATMAP_WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const day = addDays(start, w * 7 + d);
        return { day, future: day > today, xp: progress.activity[day]?.xp ?? 0 };
      }),
    );
  }, [progress.activity, today]);

  const unlockedCount = ACHIEVEMENTS.filter(a => a.id in progress.achievements).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text
            style={[
              styles.avatarText,
              !/^[A-Za-z0-9]?$/.test(initial) && { fontFamily: Fonts.sansBold, fontSize: 24 },
            ]}
          >
            {initial}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={Type.h2}>{nickname ?? 'ученик'}</Text>
          <Text style={styles.level}>
            lvl {level.level} · {level.title}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Настройки"
        >
          <Icon name="settings" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.xp}>
            {progress.totalXp} <Text style={styles.xpUnit}>xp</Text>
          </Text>
          <Text style={styles.toNext}>
            до lvl {level.level + 1}: {level.nextXp - progress.totalXp}
          </Text>
        </View>
        <ProgressBar value={level.progress} style={styles.bar} />
      </Card>

      <StatRow>
        <Stat value={streak.days} label="стрик" />
        <Stat value={progress.streak.longest} label="рекорд" />
        <Stat value={lessons.length} label="уроков" />
        <Stat value={lessons.filter(l => l.stars === 3).length} label="идеально" />
      </StatRow>

      <Card>
        <Label style={styles.mb}>активность</Label>
        <View style={styles.heatmap}>
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((l, i) => (
              <Text key={i} style={styles.dayLabel}>
                {l}
              </Text>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map(cell => (
                <View
                  key={cell.day}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: cell.future
                        ? 'transparent'
                        : intensity(cell.xp) > 0
                          ? alpha(Colors.textPrimary, 0.25 + intensity(cell.xp) * 0.75)
                          : Colors.dotOff,
                    },
                    cell.day === today && styles.cellToday,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <SectionStatsCard lessons={progress.lessons} review={progress.review} />

      <Label>{`достижения · ${unlockedCount}/${ACHIEVEMENTS.length}`}</Label>
      <View style={styles.grid}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = a.id in progress.achievements;
          return (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${a.title}: ${a.description}${unlocked ? ', получено' : ''}`}
              style={[styles.achievement, unlocked ? styles.unlocked : styles.locked]}
            >
              <Icon
                name={unlocked ? (a.icon as IconName) : 'lock'}
                size={22}
                color={unlocked ? Colors.textPrimary : Colors.textDisabled}
              />
              <Text
                style={[styles.achievementTitle, unlocked && { color: Colors.textPrimary }]}
                numberOfLines={2}
              >
                {a.title}
              </Text>
              <Text style={styles.achievementDesc} numberOfLines={3}>
                {a.description}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: Colors.textOnAccent,
  },
  flex: { flex: 1 },
  level: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.accent, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xp: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 44, color: Colors.textPrimary },
  xpUnit: { fontSize: 14, color: Colors.textMuted },
  toNext: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  bar: { marginTop: Spacing.md },
  mb: { marginBottom: Spacing.md },
  heatmap: { flexDirection: 'row', gap: 3 },
  dayLabels: { gap: 3, marginRight: 4 },
  dayLabel: {
    height: 14,
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  week: { flex: 1, gap: 3 },
  cell: { aspectRatio: 1, borderRadius: 999, maxHeight: 14 },
  cellToday: { backgroundColor: Colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  achievement: {
    width: '31.8%',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 6,
    backgroundColor: Colors.surface,
  },
  unlocked: { borderColor: Colors.borderStrong },
  locked: { borderColor: Colors.border },
  achievementTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.textMuted },
  achievementDesc: {
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    lineHeight: 14,
    color: Colors.textMuted,
  },
});
