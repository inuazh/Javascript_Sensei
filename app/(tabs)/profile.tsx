import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACHIEVEMENTS } from '../../src/domain/achievements';
import { addDays, weekStart } from '../../src/domain/dates';
import { getLevelInfo } from '../../src/domain/levels';
import { viewStreak } from '../../src/domain/streak';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import { Card, Colors, ProgressBar, Radius, Screen, Spacing, Type, alpha } from '../../src/ui';

const HEATMAP_WEEKS = 15;
const DAY_LABELS = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'];

function Stat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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
  const progress = useUserStore(s => s.progress);
  const nickname = useUserStore(s => s.settings.nickname);
  const level = getLevelInfo(progress.totalXp);
  const streak = viewStreak(progress.streak, today);
  const lessons = Object.values(progress.lessons);

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
          <Text style={styles.avatarText}>
            {nickname ? nickname.charAt(0).toUpperCase() : level.level}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={Type.h2}>{nickname ?? 'Ученик'}</Text>
          <Text style={[Type.small, { color: Colors.yellow }]}>
            Уровень {level.level} · {level.title}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Настройки"
        >
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={Type.h3}>⚡ {progress.totalXp} XP</Text>
          <Text style={Type.small}>
            до {level.level + 1} ур.: {level.nextXp - progress.totalXp} XP
          </Text>
        </View>
        <ProgressBar value={level.progress} color={Colors.yellow} style={styles.bar} />
      </Card>

      <View style={styles.stats}>
        <Stat icon="🔥" value={streak.days} label="стрик" />
        <Stat icon="🏅" value={progress.streak.longest} label="рекорд" />
        <Stat icon="📚" value={lessons.length} label="уроков" />
        <Stat icon="💯" value={lessons.filter(l => l.stars === 3).length} label="идеально" />
      </View>

      <Card>
        <Text style={[Type.caption, styles.mb]}>Активность</Text>
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
                          ? alpha(Colors.green, 0.2 + intensity(cell.xp) * 0.8)
                          : 'rgba(255,255,255,0.05)',
                    },
                    cell.day === today && styles.cellToday,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <Text style={Type.caption}>
        Достижения · {unlockedCount}/{ACHIEVEMENTS.length}
      </Text>
      <View style={styles.grid}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = a.id in progress.achievements;
          const color = Colors[a.color];
          return (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${a.title}: ${a.description}${unlocked ? ', получено' : ''}`}
              style={[
                styles.achievement,
                unlocked
                  ? { backgroundColor: alpha(color, 0.08), borderColor: alpha(color, 0.3) }
                  : styles.locked,
              ]}
            >
              <Text style={[styles.achievementIcon, !unlocked && styles.lockedIcon]}>
                {unlocked ? a.icon : '🔒'}
              </Text>
              <Text style={[styles.achievementTitle, unlocked && { color }]} numberOfLines={2}>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: alpha(Colors.yellow, 0.15),
    borderWidth: 2,
    borderColor: alpha(Colors.yellow, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: Colors.yellow },
  flex: { flex: 1 },
  gear: { fontSize: 24 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { marginTop: Spacing.md },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  mb: { marginBottom: Spacing.md },
  heatmap: { flexDirection: 'row', gap: 3 },
  dayLabels: { gap: 3, marginRight: 2 },
  dayLabel: { height: 14, fontSize: 9, color: Colors.textMuted, lineHeight: 14 },
  week: { flex: 1, gap: 3 },
  cell: { aspectRatio: 1, borderRadius: 3, maxHeight: 14 },
  cellToday: { borderWidth: 1, borderColor: Colors.yellow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  achievement: {
    width: '31.5%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  locked: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: Colors.border, opacity: 0.6 },
  achievementIcon: { fontSize: 26 },
  lockedIcon: { opacity: 0.5 },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  achievementDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
});
