import { useMemo, useState } from 'react';
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
import { Colors, Spacing, Radius } from '../../src/constants/theme';

type TabType = 'activity' | 'achievements';

interface HeatmapData {
  weeks: number[][];
}

const TOPIC_PROGRESS = [
  { name: 'Основы', done: 3, total: 3, color: Colors.green },
  { name: 'Управление', done: 2, total: 3, color: Colors.blue },
  { name: 'Коллекции', done: 0, total: 3, color: Colors.yellow },
  { name: 'Асинхронность', done: 0, total: 3, color: Colors.pink },
];

function generateHeatmap(): HeatmapData {
  const weeks = [];
  for (let w = 0; w < 15; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const isRecent = w > 11;
      const intensity = isRecent
        ? Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 1 : 0
        : w > 7
        ? Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0
        : Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;
      days.push(intensity);
    }
    weeks.push(days);
  }
  return { weeks };
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
          backgroundColor: colors[intensity],
          borderColor: intensity > 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
          borderWidth: intensity > 0 ? 0 : 1,
        },
      ]}
    />
  );
}

function AchievementCard({ achievement, unlocked }: { achievement: (typeof ACHIEVEMENTS)[0]; unlocked: boolean }) {
  const icons: Record<string, string> = {
    first_lesson: '🌅',
    streak_7: '🔥',
    streak_30: '💥',
    perfect_lesson: '💯',
    all_stars: '⭐',
    junior_dev: '🧠',
    middle_dev: '📚',
    senior_dev: '🚀',
    js_sensei: '⚡',
    section_master: '👑',
    speed_demon: '💨',
    night_owl: '🌙',
  };

  const colorMap: Record<string, string> = {
    first_lesson: Colors.orange,
    streak_7: '#F87171',
    streak_30: '#F87171',
    perfect_lesson: Colors.yellow,
    all_stars: Colors.yellow,
    junior_dev: Colors.blue,
    middle_dev: Colors.blue,
    senior_dev: '#8B5CF6',
    js_sensei: '#8B5CF6',
    section_master: Colors.yellow,
    speed_demon: Colors.pink,
    night_owl: Colors.purple,
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
      <View
        style={[
          styles.achievementIconBox,
          {
            backgroundColor: unlocked ? `${color}15` : 'rgba(255,255,255,0.03)',
          },
        ]}
      >
        <Text style={styles.achievementIcon}>{icon}</Text>
      </View>
      <Text style={[styles.achievementTitle, { color: unlocked ? Colors.textPrimary : Colors.textMuted }]}>
        {achievement.title}
      </Text>
      <Text style={styles.achievementDesc}>{achievement.description}</Text>
      {unlocked && (
        <View style={[styles.achievementBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.achievementBadgeText, { color }]}>получено</Text>
        </View>
      )}
      {!unlocked && (
        <Text style={styles.lockIcon}>🔒</Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const userStore = useUserStore();
  const userProgress = userStore.userProgress;
  const levelInfo = getLevelForXp(userProgress.totalXp);
  const heatmap = useMemo(() => generateHeatmap(), []);

  const xpInCurrentLevel = userProgress.totalXp - levelInfo.minXp;
  const xpRangeSize = levelInfo.maxXp === Infinity
    ? 100
    : levelInfo.maxXp - levelInfo.minXp;
  const xpPct = (xpInCurrentLevel / xpRangeSize) * 100;

  const totalStars = userStore.totalStars();
  const totalLessons = userStore.totalLessons();
  const accuracy = totalLessons > 0 ? 78 : 0;

  const stats = [
    { icon: '🔥', value: String(userProgress.currentStreak), label: 'дней стрик', color: Colors.orange },
    { icon: '⭐', value: String(totalStars), label: 'звёзд', color: Colors.yellow },
    { icon: '✅', value: String(totalLessons), label: 'уроков', color: Colors.green },
    { icon: '🎯', value: `${accuracy}%`, label: 'точность', color: Colors.blue },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Text style={styles.backButton}>← Назад</Text>
            <Text style={styles.settingsButton}>⚙</Text>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>R</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv.{userStore.currentLevel()}</Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.username}>Rami</Text>
              <Text style={styles.levelTitle}>{userStore.currentTitle()}</Text>

              {/* XP Progress Bar */}
              <View style={styles.xpSection}>
                <View style={styles.xpLabel}>
                  <Text style={styles.xpText}>
                    {userProgress.totalXp} / {levelInfo.maxXp === Infinity ? '∞' : levelInfo.maxXp} XP
                  </Text>
                  <Text style={styles.nextLevelText}>Lv.{userStore.currentLevel() + 1}</Text>
                </View>
                <View style={styles.xpBarBackground}>
                  <View
                    style={[
                      styles.xpBarFill,
                      { width: `${Math.min(xpPct, 100)}%` },
                    ]}
                  />
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
            <Text
              style={[
                styles.tabText,
                activeTab === 'activity' && styles.tabTextActive,
              ]}
            >
              Активность
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'achievements' && styles.tabActive]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'achievements' && styles.tabTextActive,
              ]}
            >
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
                    {heatmap.weeks.map((week, wi) => (
                      <View key={wi} style={styles.heatmapWeek}>
                        {week.map((intensity, di) => (
                          <HeatmapCell key={di} intensity={intensity} />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Legend */}
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
                <Text style={styles.cardTitle}>Прогресс по темам</Text>
                <View style={styles.topicsContainer}>
                  {TOPIC_PROGRESS.map((topic, i) => (
                    <View key={i}>
                      <View style={styles.topicHeader}>
                        <Text style={styles.topicName}>{topic.name}</Text>
                        <Text style={[styles.topicProgress, { color: topic.color }]}>
                          {topic.done}/{topic.total}
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${(topic.done / topic.total) * 100}%`,
                              backgroundColor: topic.color,
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
                  unlocked={Math.random() > 0.4}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  backButton: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  settingsButton: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.yellow,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.background,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  levelTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  xpSection: {
    marginTop: Spacing.md,
  },
  xpLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  xpText: {
    fontSize: 11,
    color: Colors.textDisabled,
  },
  nextLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.yellow,
  },
  xpBarBackground: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statsGrid: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textDisabled,
    marginTop: Spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDisabled,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  tabContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.textDisabled,
  },
  heatmapContainer: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heatmapWeek: {
    gap: Spacing.sm,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 3.5,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  legendLabel: {
    fontSize: 10,
    color: Colors.textDisabled,
  },
  topicsContainer: {
    gap: Spacing.lg,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  topicProgress: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  achievementCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  achievementIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 11,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
  achievementBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  achievementBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  lockIcon: {
    fontSize: 16,
    marginTop: Spacing.xs,
  },
});
