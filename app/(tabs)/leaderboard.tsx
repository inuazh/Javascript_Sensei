import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../src/stores/useUserStore';
import { Colors, Spacing, Radius } from '../../src/constants/theme';

// Simulated leaderboard entries — the player always appears in position 1
const FAKE_PLAYERS = [
  { name: 'alex_dev', xp: 2340, streak: 14, avatar: 'A' },
  { name: 'maria_js', xp: 1890, streak: 8, avatar: 'M' },
  { name: 'ivan_code', xp: 1450, streak: 5, avatar: 'I' },
  { name: 'olga_ts', xp: 980, streak: 3, avatar: 'O' },
];

const MEDAL = ['🥇', '🥈', '🥉'];
const AVATAR_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

function PlayerRow({
  rank,
  name,
  xp,
  streak,
  avatar,
  avatarColor,
  isYou,
}: {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  avatar: string;
  avatarColor: string;
  isYou: boolean;
}) {
  return (
    <View
      style={[
        styles.playerRow,
        isYou && styles.playerRowYou,
        rank === 1 && styles.playerRowFirst,
      ]}
    >
      {/* Rank */}
      <View style={styles.rankBox}>
        {rank <= 3 ? (
          <Text style={styles.medal}>{MEDAL[rank - 1]}</Text>
        ) : (
          <Text style={styles.rankNum}>#{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{avatar}</Text>
      </View>

      {/* Info */}
      <View style={styles.playerInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.playerName, isYou && styles.playerNameYou]}>{name}</Text>
          {isYou && <View style={styles.youBadge}><Text style={styles.youBadgeText}>Вы</Text></View>}
        </View>
        <Text style={styles.playerStreak}>🔥 {streak} дней стрик</Text>
      </View>

      {/* XP */}
      <Text style={[styles.playerXp, isYou && styles.playerXpYou]}>{xp} XP</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const userStore = useUserStore();
  const userXp = userStore.userProgress.totalXp;
  const userStreak = userStore.userProgress.currentStreak;

  // Build full leaderboard: user always at rank 1
  const entries = [
    { name: 'Ты', xp: Math.max(userXp, FAKE_PLAYERS[0].xp + 1), streak: userStreak, avatar: 'Я', avatarColor: '#6366F1', isYou: true },
    ...FAKE_PLAYERS.map((p, i) => ({ ...p, avatarColor: AVATAR_COLORS[i], isYou: false })),
  ].sort((a, b) => b.xp - a.xp);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Рейтинг</Text>
          <Text style={styles.headerSub}>Топ игроков</Text>
        </View>

        {/* Coming Soon Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🌍</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Глобальный рейтинг</Text>
            <Text style={styles.bannerDesc}>Скоро — соревнуйся с игроками по всему миру</Text>
          </View>
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>Скоро</Text>
          </View>
        </View>

        {/* This week label */}
        <Text style={styles.sectionLabel}>ЛОКАЛЬНЫЙ РЕЙТИНГ</Text>

        {/* Leaderboard */}
        <View style={styles.leaderboardCard}>
          {entries.map((entry, i) => (
            <PlayerRow
              key={entry.name}
              rank={i + 1}
              name={entry.name}
              xp={entry.xp}
              streak={entry.streak}
              avatar={entry.avatar}
              avatarColor={entry.avatarColor}
              isYou={entry.isYou}
            />
          ))}
        </View>

        {/* Motivational card */}
        <View style={styles.motivCard}>
          <Text style={styles.motivIcon}>🚀</Text>
          <Text style={styles.motivTitle}>Учись каждый день</Text>
          <Text style={styles.motivDesc}>
            Проходи уроки и ежедневные задания, чтобы набирать XP и подниматься в рейтинге
          </Text>
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

  banner: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)', borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  bannerIcon: { fontSize: 28 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  bannerDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  soonBadge: {
    backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  soonBadgeText: { fontSize: 11, fontWeight: '700', color: '#818CF8' },

  sectionLabel: {
    paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1,
  },

  leaderboardCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: Colors.border, borderRadius: Radius.xl, overflow: 'hidden',
  },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  playerRowYou: {
    backgroundColor: 'rgba(250,204,21,0.04)',
    borderLeftWidth: 2, borderLeftColor: Colors.yellow,
  },
  playerRowFirst: {
    backgroundColor: 'rgba(250,204,21,0.03)',
  },

  rankBox: { width: 32, alignItems: 'center' },
  medal: { fontSize: 20 },
  rankNum: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },

  avatar: {
    width: 40, height: 40, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  playerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  playerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  playerNameYou: { color: Colors.yellow },
  youBadge: {
    backgroundColor: 'rgba(250,204,21,0.12)', borderRadius: 99,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  youBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.yellow },
  playerStreak: { fontSize: 12, color: Colors.textMuted },

  playerXp: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
  playerXpYou: { color: Colors.yellow },

  motivCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
    borderColor: Colors.border, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
  },
  motivIcon: { fontSize: 32 },
  motivTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  motivDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
