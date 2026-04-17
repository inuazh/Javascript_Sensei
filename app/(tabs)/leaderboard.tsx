import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../src/stores/useUserStore';
import { Colors, Spacing, Radius } from '../../src/constants/theme';
import { fetchTopPlayers, FIREBASE_DB_URL, LeaderboardEntry } from '../../src/utils/leaderboard';
import { getDeviceId } from '../../src/utils/deviceId';
import { getLevelForXp } from '../../src/constants/gamification';

const MEDAL = ['🥇', '🥈', '🥉'];
const AVATAR_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#14B8A6', '#F97316', '#A855F7'];

function avatarLetter(title: string) {
  return title.charAt(0).toUpperCase() || 'J';
}

function PlayerRow({
  rank, title, xp, streak, avatarColor, isYou,
}: {
  rank: number; title: string; xp: number; streak: number;
  avatarColor: string; isYou: boolean;
}) {
  return (
    <View style={[styles.playerRow, isYou && styles.playerRowYou, rank === 1 && styles.playerRowFirst]}>
      <View style={styles.rankBox}>
        {rank <= 3
          ? <Text style={styles.medal}>{MEDAL[rank - 1]}</Text>
          : <Text style={styles.rankNum}>#{rank}</Text>}
      </View>

      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{avatarLetter(title)}</Text>
      </View>

      <View style={styles.playerInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.playerName, isYou && styles.playerNameYou]}>{title}</Text>
          {isYou && <View style={styles.youBadge}><Text style={styles.youBadgeText}>Вы</Text></View>}
        </View>
        <Text style={styles.playerStreak}>🔥 {streak} дней стрик</Text>
      </View>

      <Text style={[styles.playerXp, isYou && styles.playerXpYou]}>{xp} XP</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const userStore = useUserStore();
  const userXp = userStore.userProgress.totalXp;
  const userStreak = userStore.userProgress.currentStreak;
  const userTitle = getLevelForXp(userXp).title;

  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!FIREBASE_DB_URL) return;
    setLoading(true);
    setError(false);
    try {
      const [top, devId] = await Promise.all([fetchTopPlayers(50), getDeviceId()]);
      setPlayers(top);
      setMyDeviceId(devId);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isFirebaseConfigured = !!FIREBASE_DB_URL;

  // Build display list
  const displayList: Array<LeaderboardEntry & { isYou: boolean }> = isFirebaseConfigured && players.length > 0
    ? players.map(p => ({ ...p, isYou: p.id === myDeviceId }))
    : [
        { id: 'you', xp: userXp, title: userTitle, streak: userStreak, updatedAt: '', isYou: true },
        { id: 'p1', xp: 2340, title: 'Senior Dev', streak: 14, updatedAt: '', isYou: false },
        { id: 'p2', xp: 1890, title: 'Middle Dev', streak: 8, updatedAt: '', isYou: false },
        { id: 'p3', xp: 1450, title: 'Junior Dev', streak: 5, updatedAt: '', isYou: false },
        { id: 'p4', xp: 980, title: 'Beginner', streak: 3, updatedAt: '', isYou: false },
      ].sort((a, b) => b.xp - a.xp);

  const myRank = displayList.findIndex(p => p.isYou) + 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Рейтинг</Text>
          {myRank > 0 && (
            <Text style={styles.headerSub}>Вы на {myRank} месте</Text>
          )}
        </View>

        {/* Status banner */}
        {!isFirebaseConfigured ? (
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
        ) : error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Нет соединения</Text>
              <Text style={styles.bannerDesc}>Показаны локальные данные</Text>
            </View>
            <Pressable onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Повтор</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>
          {isFirebaseConfigured ? 'ГЛОБАЛЬНЫЙ РЕЙТИНГ' : 'ЛОКАЛЬНЫЙ РЕЙТИНГ'}
        </Text>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.yellow} />
            <Text style={styles.loadingText}>Загружаем рейтинг…</Text>
          </View>
        )}

        {/* List */}
        {!loading && (
          <View style={styles.leaderboardCard}>
            {displayList.map((entry, i) => (
              <PlayerRow
                key={entry.id}
                rank={i + 1}
                title={entry.title}
                xp={entry.xp}
                streak={entry.streak}
                avatarColor={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                isYou={entry.isYou}
              />
            ))}
          </View>
        )}

        {/* Motivation */}
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
  retryBtn: {
    backgroundColor: 'rgba(250,204,21,0.12)', borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  retryText: { fontSize: 11, fontWeight: '700', color: Colors.yellow },

  sectionLabel: {
    paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1,
  },

  loadingBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: 13, color: Colors.textMuted },

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
  playerRowFirst: { backgroundColor: 'rgba(250,204,21,0.03)' },

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
