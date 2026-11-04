import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDays, daysBetween, weekStart } from '../../src/domain/dates';
import { weeklyXp } from '../../src/domain/progress';
import { plural } from '../../src/domain/reminders';
import { useToday } from '../../src/hooks/useToday';
import { publishScore } from '../../src/services/activity';
import {
  fetchPlayers,
  rankAllTime,
  rankWeekly,
  validateNickname,
  type PlayerEntry,
} from '../../src/services/leaderboard';
import { useUserStore } from '../../src/stores/useUserStore';
import { Button, Card, Colors, Fonts, Radius, Spacing, Type, alpha } from '../../src/ui';

type Mode = 'week' | 'all';
const MEDALS = ['🥇', '🥈', '🥉'];
const AVATAR_COLORS = [
  Colors.purple,
  Colors.pink,
  Colors.green,
  Colors.orange,
  Colors.blue,
  Colors.yellow,
];

function avatarColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function JoinCard() {
  const updateSettings = useUserStore(s => s.updateSettings);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const join = async () => {
    const problem = validateNickname(nickname);
    if (problem) return setError(problem);
    setSaving(true);
    updateSettings({ nickname: nickname.trim() });
    try {
      await publishScore();
    } catch {
      // Offline or the server is unavailable: retried after the next activity.
    }
    setSaving(false);
  };

  return (
    <Card color={Colors.yellow} style={styles.join}>
      <Text style={Type.h3}>🏆 Участвуй в рейтинге</Text>
      <Text style={Type.small}>
        Выбери ник — в рейтинг попадут только он, твой XP, уровень и стрик. Выйти можно в
        настройках.
      </Text>
      <TextInput
        value={nickname}
        onChangeText={t => {
          setNickname(t);
          setError(null);
        }}
        placeholder="Твой ник"
        placeholderTextColor={Colors.textDisabled}
        maxLength={20}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        onSubmitEditing={join}
        returnKeyType="done"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Участвовать"
        onPress={join}
        loading={saving}
        disabled={nickname.trim().length < 3}
      />
    </Card>
  );
}

function Row({
  rank,
  player,
  value,
  isYou,
}: {
  rank: number;
  player: PlayerEntry;
  value: number;
  isYou: boolean;
}) {
  const color = avatarColor(player.id);
  return (
    <View style={[styles.row, isYou && styles.rowYou]}>
      <Text style={styles.rank}>{rank <= 3 ? MEDALS[rank - 1] : rank}</Text>
      <View style={[styles.avatar, { backgroundColor: alpha(color, 0.25) }]}>
        <Text style={[styles.avatarText, { color }]}>
          {player.nickname.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.name, isYou && { color: Colors.yellow }]} numberOfLines={1}>
          {player.nickname}
          {isYou ? ' (ты)' : ''}
        </Text>
        <Text style={Type.small}>
          ур. {player.level} · 🔥 {player.streak}
        </Text>
      </View>
      <Text style={[styles.xp, isYou && { color: Colors.yellow }]}>{value} XP</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const today = useToday();
  const settings = useUserStore(s => s.settings);
  const progress = useUserStore(s => s.progress);
  const [mode, setMode] = useState<Mode>('week');
  const [players, setPlayers] = useState<PlayerEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setPlayers(await fetchPlayers());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, settings.nickname]);

  const refresh = async () => {
    setRefreshing(true);
    await publishScore().catch(() => {});
    await load();
    setRefreshing(false);
  };

  const week = weekStart(today);
  const daysLeft = daysBetween(today, addDays(week, 7));
  const ranked = players
    ? mode === 'week'
      ? rankWeekly(players, week)
      : rankAllTime(players)
    : [];
  const myRank = ranked.findIndex(p => p.id === settings.playerId) + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.yellow} />
        }
      >
        <Text style={Type.h1}>Рейтинг</Text>
        <View style={styles.tabs}>
          {(['week', 'all'] as const).map(m => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === 'week' ? 'Эта неделя' : 'Всё время'}
              </Text>
            </Pressable>
          ))}
        </View>
        {mode === 'week' && (
          <Text style={Type.small}>
            Неделя обнулится через {daysLeft} {plural(daysLeft, 'день', 'дня', 'дней')}. Твой XP за
            неделю: {weeklyXp(progress, today)}.
          </Text>
        )}

        {!settings.nickname && <JoinCard />}
        {settings.nickname && myRank > 0 && (
          <Card color={Colors.yellow}>
            <Text style={Type.h3}>
              Ты на {myRank} месте{myRank <= 3 ? ' 🎉' : ''}
            </Text>
          </Card>
        )}

        {players === null && !error && (
          <ActivityIndicator color={Colors.yellow} style={styles.loader} />
        )}
        {error && (
          <Card>
            <Text style={Type.h3}>Не удалось загрузить рейтинг</Text>
            <Text style={Type.small}>Проверь интернет и попробуй ещё раз.</Text>
            <Button title="Повторить" variant="secondary" onPress={load} style={styles.retry} />
          </Card>
        )}
        {players !== null && ranked.length === 0 && !error && (
          <Text style={[Type.small, styles.empty]}>
            {mode === 'week'
              ? 'На этой неделе ещё никто не занимался. Стань первым!'
              : 'Пока пусто.'}
          </Text>
        )}
        {ranked.slice(0, 50).map((p, i) => (
          <Row
            key={p.id}
            rank={i + 1}
            player={p}
            value={mode === 'week' ? p.weekXp : p.xp}
            isYou={p.id === settings.playerId}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.md,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: alpha(Colors.yellow, 0.15) },
  tabText: { color: Colors.textMuted, fontWeight: '700' },
  tabTextActive: { color: Colors.yellow },
  join: { gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  error: { color: Colors.danger, fontSize: 13 },
  loader: { marginTop: Spacing.xxl },
  retry: { marginTop: Spacing.md },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowYou: { borderColor: alpha(Colors.yellow, 0.4), backgroundColor: alpha(Colors.yellow, 0.06) },
  rank: {
    width: 28,
    textAlign: 'center',
    color: Colors.textMuted,
    fontWeight: '800',
    fontSize: 15,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '900', fontSize: 16 },
  flex: { flex: 1 },
  name: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  xp: { fontFamily: Fonts.mono, fontWeight: '800', color: Colors.textSecondary },
});
