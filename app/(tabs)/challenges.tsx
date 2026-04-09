import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../src/stores/useUserStore';
import { XP_DAILY_CHALLENGE } from '../../src/constants/gamification';
import { Colors, Spacing, Radius } from '../../src/constants/theme';

// All available topics for daily challenge selection
const ALL_TOPICS = [
  { id: 'variables', title: 'Переменные', section: 'basics', sectionColor: Colors.green },
  { id: 'data-types', title: 'Типы данных', section: 'basics', sectionColor: Colors.green },
  { id: 'operators', title: 'Операторы', section: 'basics', sectionColor: Colors.green },
  { id: 'conditions', title: 'Условия', section: 'control', sectionColor: Colors.blue },
  { id: 'loops', title: 'Циклы', section: 'control', sectionColor: Colors.blue },
  { id: 'functions', title: 'Функции', section: 'control', sectionColor: Colors.blue },
  { id: 'arrays', title: 'Массивы', section: 'collections', sectionColor: Colors.yellow },
  { id: 'objects', title: 'Объекты', section: 'collections', sectionColor: Colors.yellow },
  { id: 'set-map', title: 'Set & Map', section: 'collections', sectionColor: Colors.yellow },
];

const SECTION_ICONS: Record<string, string> = {
  basics: '🌱',
  control: '🔀',
  collections: '📦',
};

function getISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Deterministic topic pick based on date — same challenge all day, changes daily
function getDailyTopic(date: string): (typeof ALL_TOPICS)[0] {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) & 0xffffffff;
  }
  return ALL_TOPICS[Math.abs(hash) % ALL_TOPICS.length];
}

// Streak stat card
function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}15` }]}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}10` }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ChallengesScreen() {
  const router = useRouter();
  const userStore = useUserStore();
  const { dailyChallenge, setDailyChallenge, userProgress, totalLessons } = userStore;

  const today = getISODate(new Date());
  const todayTopic = getDailyTopic(today);

  // Ensure dailyChallenge state is current for today
  useEffect(() => {
    if (!dailyChallenge || dailyChallenge.date !== today) {
      setDailyChallenge({
        date: today,
        topicId: todayTopic.id,
        lessonId: '',
        completed: false,
      });
    }
  }, [today]);

  const isTodayCompleted = dailyChallenge?.date === today && dailyChallenge.completed;
  const totalLessonsCount = totalLessons();

  const handleStartChallenge = () => {
    router.push(`/lesson/${todayTopic.id}?isChallenge=true`);
  };

  // Streak info
  const streak = userProgress.currentStreak;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Задания</Text>
          <Text style={styles.headerSub}>Ежедневный челлендж</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="🔥" value={String(streak)} label="стрик" color={Colors.orange} />
          <StatCard icon="✅" value={String(totalLessonsCount)} label="уроков" color={Colors.green} />
          <StatCard icon="⚡" value={`+${XP_DAILY_CHALLENGE}`} label="XP сегодня" color={Colors.yellow} />
        </View>

        {/* Daily Challenge Card */}
        <View style={[styles.challengeCard, isTodayCompleted && styles.challengeCardCompleted]}>
          {/* Top badge */}
          <View style={styles.challengeTopRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>СЕГОДНЯ</Text>
            </View>
            {isTodayCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓ ВЫПОЛНЕНО</Text>
              </View>
            )}
          </View>

          {/* Topic info */}
          <View style={styles.topicRow}>
            <View style={[styles.topicIconBox, { backgroundColor: `${todayTopic.sectionColor}15` }]}>
              <Text style={styles.topicIcon}>{SECTION_ICONS[todayTopic.section]}</Text>
            </View>
            <View style={styles.topicInfo}>
              <Text style={styles.topicTitle}>{todayTopic.title}</Text>
              <Text style={[styles.topicSection, { color: todayTopic.sectionColor }]}>
                {todayTopic.section === 'basics' ? 'Основы'
                  : todayTopic.section === 'control' ? 'Управление' : 'Коллекции'}
              </Text>
            </View>
          </View>

          {/* Reward */}
          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>✨</Text>
              <Text style={styles.rewardText}>+{XP_DAILY_CHALLENGE} XP</Text>
            </View>
            <View style={styles.rewardDot} />
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>🔥</Text>
              <Text style={styles.rewardText}>+1 день к стрику</Text>
            </View>
          </View>

          {/* CTA */}
          {isTodayCompleted ? (
            <View style={styles.completedMessage}>
              <Text style={styles.completedEmoji}>🏆</Text>
              <Text style={styles.completedText}>Задание выполнено! Возвращайся завтра</Text>
            </View>
          ) : (
            <Pressable style={styles.startButton} onPress={handleStartChallenge}>
              <Text style={styles.startButtonText}>Начать задание →</Text>
            </Pressable>
          )}
        </View>

        {/* Info cards */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Как это работает</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoItem}>🎯 Каждый день — новая тема для повторения</Text>
            <Text style={styles.infoItem}>⚡ Выполни задание и получи +{XP_DAILY_CHALLENGE} XP</Text>
            <Text style={styles.infoItem}>🔥 Сохрани стрик — не пропускай дни</Text>
            <Text style={styles.infoItem}>🏆 Стрик 7 дней разблокирует достижение</Text>
          </View>
        </View>

        {/* Upcoming days preview */}
        <View style={styles.weekSection}>
          <Text style={styles.infoTitle}>Ближайшие темы</Text>
          <View style={styles.weekCards}>
            {[1, 2, 3].map((offset) => {
              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + offset);
              const futureDateStr = getISODate(futureDate);
              const futureTopic = getDailyTopic(futureDateStr);
              const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              const dayName = dayNames[futureDate.getDay()];

              return (
                <View key={offset} style={styles.weekCard}>
                  <Text style={styles.weekCardDay}>{dayName}</Text>
                  <Text style={styles.weekCardIcon}>{SECTION_ICONS[futureTopic.section]}</Text>
                  <Text style={styles.weekCardTopic} numberOfLines={1}>{futureTopic.title}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 100 },

  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  headerSub: { fontSize: 14, color: Colors.textSecondary },

  statsRow: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.lg, borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
  },
  statIconBox: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textDisabled, textAlign: 'center' },

  challengeCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    backgroundColor: 'rgba(250,204,21,0.04)',
    borderWidth: 1, borderColor: 'rgba(250,204,21,0.15)',
    borderRadius: Radius.xl, padding: Spacing.xl,
  },
  challengeCardCompleted: {
    backgroundColor: 'rgba(52,211,153,0.04)',
    borderColor: 'rgba(52,211,153,0.15)',
  },

  challengeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  dateBadge: {
    backgroundColor: 'rgba(250,204,21,0.1)', borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  dateBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.yellow, letterSpacing: 0.5 },
  completedBadge: {
    backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  completedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.green, letterSpacing: 0.5 },

  topicRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.xl },
  topicIconBox: { width: 56, height: 56, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center' },
  topicIcon: { fontSize: 28 },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  topicSection: { fontSize: 13, fontWeight: '600' },

  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rewardIcon: { fontSize: 14 },
  rewardText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  rewardDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.border },

  startButton: {
    backgroundColor: Colors.yellow, borderRadius: Radius.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
  },
  startButtonText: { fontSize: 16, fontWeight: '700', color: '#0A0A0A' },

  completedMessage: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    justifyContent: 'center',
    backgroundColor: 'rgba(52,211,153,0.06)', borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
  },
  completedEmoji: { fontSize: 24 },
  completedText: { fontSize: 14, fontWeight: '600', color: Colors.green },

  infoSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  infoTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.lg, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.lg,
  },
  infoItem: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  weekSection: { paddingHorizontal: Spacing.xl },
  weekCards: { flexDirection: 'row', gap: Spacing.md },
  weekCard: {
    flex: 1, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: Colors.border, borderRadius: Radius.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm,
  },
  weekCardDay: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  weekCardIcon: { fontSize: 20 },
  weekCardTopic: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
});
