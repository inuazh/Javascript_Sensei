import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../src/stores/useUserStore';
import { getLevelForXp, ACHIEVEMENTS } from '../../src/constants/gamification';
import { getActivityHeatmap } from '../../src/db/database';
import { Colors, Spacing, Radius } from '../../src/constants/theme';

type TabType = 'activity' | 'achievements';

// Section info for topic progress display
const SECTIONS = [
  {
    name: 'Основы',
    color: Colors.green,
    topicIds: ['variables', 'data-types', 'operators'],
  },
  {
    name: 'Управление',
    color: Colors.blue,
    topicIds: ['conditions', 'loops', 'functions'],
  },
  {
    name: 'Коллекции',
    color: Colors.yellow,
    topicIds: ['arrays', 'objects', 'set-map'],
  },
];

// Build 15-week heatmap grid from a date→count map
function buildHeatmapGrid(activityMap: Record<string, number>): number[][] {
  const weeks: number[][] = [];
  const today = new Date();
  // Go back 14 full weeks + partial current week = 105 days total
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 104);
  // Align to Monday
  const dayOfWeek = startDate.getDay(); // 0=Sun
  startDate.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7));

  let current = new Date(startDate);
  for (let w = 0; w < 15; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0];
      const count = activityMap[dateStr] || 0;
      // Clamp to 0–4 intensity
      week.push(Math.min(count, 4));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function HeatmapCell({ intensity }: { intensity: number }) {
  const colors = [
    'rgba(255,255,255,0.03)',
    'rgba(250,204,21,0.15)',
    'rgba(250,204,21,0.3)',
    'rgba(250,204,21,0.5)',
    'rgba(250,204,21,0.75)',
  ];
  return (
    <View
      style={[
        styles.heatmapCell,
        {
          backgroundColor: colors[intensity] ?? colors[0],
          borderColor: intensity > 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
          borderWidth: intensity > 0 ? 0 : 1,
        },
      ]}
    />
  );
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: (typeof ACHIEVEMENTS)[0];
  unlocked: boolean;
}) {
  const icons: Record<string, string> = {
    first_lesson: '🌅', streak_7: '🔥', streak_30: '💥', perfect_lesson: '💯',
    all_stars: '⭐', junior_dev: '🧠', middle_dev: '📚', senior_dev: '🚀',
    js_sensei: '⚡', section_master: '👑', speed_demon: '💨', night_owl: '🌙',
  };
  const colorMap: Record<string, string> = {
    first_lesson: Colors.orange, streak_7: '#F87171', streak_30: '#F87171',
    perfect_lesson: Colors.yellow, all_stars: Colors.yellow,
    junior_dev: Colors.blue, middle_dev: Colors.blue,
    senior_dev: '#8B5CF6', js_sensei: '#8B5CF6',
    section_master: Colors.yellow, speed_demon: Colors.pink, night_owl: Colors.purple,
  };

  const icon = icons[achievement.id] || '🏆';
  const color = colorMap[achievement.id] || Colors.yellow;

  return (
    <View
      style={[
        styles.achievementCard,
        {
          backgroundColor: unlocked ? `${color}08` : 'rgba(255,255,255,0.02)',
          borderColor: unlocked ? `${color}20` : Colors.border,
          opacity: unlocked ? 1 : 0.4,
        },
      ]}
    >
      <View style={[styles.achievementIconBox, { backgroundColor: unlocked ? `${color}15` : 'rgba(255,255,255,0.03)' }]}>
        <Text style={styles.achievementIcon}>{icon}</Text>
      </View>
      <Text style={[styles.achievementTitle, { color: unlocked ? Colors.textPrimary : Colors.textMuted }]}>
        {achievement.title}
      </Text>
      <Text style={styles.achievementDesc}>{achievement.description}</Text>
      {unlocked ? (
        <View style={[styles.achievementBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.achievementBadgeText, { color }]}>получено</Text>
        </View>
      ) : (
        <Text style={styles.lockIcon}>🔒</Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [heatmapGrid, setHeatmapGrid] = useState<number[][]>([]);
  const userStore = useUserStore();
  const { userProgress, topicsProgress, lessonResults, unlockedAchievements } = userStore;
  const levelInfo = getLevelForXp(userProgress.totalXp);

  // Load real heatmap data from SQLite
  useEffect(() => {
    try {
      const activityMap = getActivityHeatmap();
      setHeatmapGrid(buildHeatmapGrid(activityMap));
    } catch {
      // DB might not be ready yet — show empty grid
      setHeatmapGrid(buildHeatmapGrid({}));
    }
  }, []);

  const xpInCurrentLevel = userProgress.totalXp - levelInfo.minXp;
  const xpRangeSize = levelInfo.maxXp === Infinity ? 1000 : levelInfo.maxXp - levelInfo.minXp;
  const xpPct = Math.min((xpInCurrentLevel / xpRangeSize) * 100, 100);

  const totalStars = userStore.totalStars();
  const totalLessons = userStore.totalLessons();

  // Compute accuracy from actual lesson results
  const accuracy = useMemo(() => {
    if (lessonResults.length === 0) return 0;
    const totalCorrect = lessonResults.reduce((sum, r) => sum + r.correctAnswers, 0);
    const totalQ = lessonResults.reduce((sum, r) => sum + r.totalQuestions, 0);
    return totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  }, [lessonResults]);

  // Topic section progress from real store data
  const sectionProgress = useMemo(() =>
    SECTIONS.map(section => {
      const done = section.topicIds.filter(id => {
        const prog = topicsProgress[id];
        return prog && prog.completedLessons.length > 0;
      }).length;
      return { ...section, done, total: section.topicIds.length };
    }),
    [topicsProgress]
  );

  const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

  const stats = [
    { icon: '🔥', value: String(userProgress.currentStreak), label: 'дней стрик', color: Colors.orange },
    { icon: '⭐', value: String(totalStars), label: 'звёзд', color: Colors.yellow },
    { icon: '✅', value: String(totalLessons), label: 'уроков', color: Colors.green },
    { icon: '🎯', value: `${accuracy}%`, label: 'точность', color: Colors.blue },
  ];

  // Avatar letter: first letter of selected level title, fallback 'J'
  const avatarLetter = userProgress.selectedLevel === 'advanced' ? 'A'
    : userProgress.selectedLevel === 'intermediate' ? 'I' : 'J';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Профиль</Text>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv.{userStore.currentLevel()}</Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.username}>JS Sensei</Text>
              <Text style={styles.levelTitle}>{userStore.currentTitle()}</Text>

              <View style={styles.xpSection}>
                <View style={styles.xpLabel}>
                  <Text style={styles.xpText}>
                    {userProgress.totalXp} / {levelInfo.maxXp === Infinity ? '∞' : levelInfo.maxXp} XP
                  </Text>
                  <Text style={styles.nextLevelText}>
                    Lv.{userStore.currentLevel() + 1}
                  </Text>
                </View>
                <View style={styles.xpBarBackground}>
                  <View style={[styles.xpBarFill, { width: `${xpPct}%` }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderColor: `${stat.color}12` }]}>
              <View style={[styles.statIconBox, { backgroundColor: `${stat.color}10` }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
              Активность
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'achievements' && styles.tabActive]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.tabTextActive]}>
              Достижения
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'activity' && (
            <View>
              {/* Heatmap */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Активность</Text>
                  <Text style={styles.cardSubtitle}>последние 15 недель</Text>
                </View>
                <View style={styles.heatmapContainer}>
                  <View style={styles.heatmapGrid}>
                    {heatmapGrid.map((week, wi) => (
                      <View key={wi} style={styles.heatmapWeek}>
                        {week.map((intensity, di) => (
                          <HeatmapCell key={di} intensity={intensity} />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.heatmapLegend}>
                  <Text style={styles.legendLabel}>меньше</Text>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <HeatmapCell key={i} intensity={i} />
                  ))}
                  <Text style={styles.legendLabel}>больше</Text>
                </View>
              </View>

              {/* Topics Progress */}
              <View style={[styles.card, { marginBottom: Spacing.xxl }]}>
                <Text style={styles.cardTitle}>Прогресс по разделам</Text>
                <View style={styles.topicsContainer}>
                  {sectionProgress.map((section, i) => (
                    <View key={i}>
                      <View style={styles.topicHeader}>
                        <Text style={styles.topicName}>{section.name}</Text>
                        <Text style={[styles.topicProgressText, { color: section.color }]}>
                          {section.done}/{section.total}
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${(section.done / section.total) * 100}%`,
                              backgroundColor: section.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'achievements' && (
            <View style={styles.achievementsGrid}>
              {ACHIEVEMENTS.map((achievement, i) => (
                <AchievementCard
                  key={i}
                  achievement={achievement}
                  unlocked={unlockedIds.has(achievement.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  topBar: { marginBottom: Spacing.xxl },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(139,92,246,0.3)',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  levelBadge: {
    position: 'absolute', bottom: -6, right: -6,
    backgroundColor: Colors.yellow, borderRadius: 10,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 2, borderColor: Colors.background,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.background },
  userInfo: { flex: 1 },
  username: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  levelTitle: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg },
  xpSection: { marginTop: Spacing.md },
  xpLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  xpText: { fontSize: 11, color: Colors.textDisabled },
  nextLevelText: { fontSize: 11, fontWeight: '700', color: Colors.yellow },
  xpBarBackground: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  xpBarFill: {
    height: '100%', borderRadius: 99, backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  statsGrid: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md,
  },
  statCard: {
    flex: 1, minWidth: '48%', flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
  },
  statIconBox: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textDisabled, marginTop: Spacing.xs },
  tabsContainer: {
    flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl,
  },
  tab: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textDisabled },
  tabTextActive: { color: Colors.textPrimary },
  tabContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.xl,
    padding: Spacing.xl, marginBottom: Spacing.xl,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  cardTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  cardSubtitle: { fontSize: 11, color: Colors.textDisabled },
  heatmapContainer: { marginBottom: Spacing.lg, overflow: 'hidden' },
  heatmapGrid: { flexDirection: 'row', gap: Spacing.sm },
  heatmapWeek: { gap: Spacing.sm },
  heatmapCell: { width: 14, height: 14, borderRadius: 3.5 },
  heatmapLegend: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: Spacing.sm, marginTop: Spacing.lg,
  },
  legendLabel: { fontSize: 10, color: Colors.textDisabled },
  topicsContainer: { gap: Spacing.lg, marginTop: Spacing.lg },
  topicHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  topicName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  topicProgressText: { fontSize: 12, fontWeight: '700' },
  progressBarBackground: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 99 },
  achievementsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingBottom: Spacing.xxl,
  },
  achievementCard: {
    width: '48%', borderWidth: 1, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.md,
  },
  achievementIconBox: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  achievementIcon: { fontSize: 24 },
  achievementTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  achievementDesc: { fontSize: 11, color: Colors.textDisabled, textAlign: 'center' },
  achievementBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  achievementBadgeText: { fontSize: 10, fontWeight: '700' },
  lockIcon: { fontSize: 16, marginTop: Spacing.xs },
});
