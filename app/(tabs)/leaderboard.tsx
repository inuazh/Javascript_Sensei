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
import { addDays, daysBetween, weekNumber, weekStart } from '../../src/domain/dates';
import { NICKNAME_MAX, NICKNAME_MIN, validateNickname } from '../../src/domain/nickname';
import { weeklyXp } from '../../src/domain/progress';
import { plural } from '../../src/domain/reminders';
import { useToday } from '../../src/hooks/useToday';
import { publishScore } from '../../src/services/activity';
import {
  fetchAllTime,
  fetchWeek,
  rankAllTime,
  rankWeekly,
  type PlayerEntry,
} from '../../src/services/leaderboard';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Button,
  Card,
  Colors,
  Fonts,
  Icon,
  Label,
  Radius,
  Spacing,
  Type,
  pad2,
} from '../../src/ui';

type Mode = 'week' | 'all';

function JoinCard({ outdated }: { outdated: boolean }) {
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
    <Card tone="accent" style={styles.join}>
      <Label>войти в рейтинг</Label>
      <Text style={Type.h3}>Выбери ник</Text>
      <Text style={Type.small}>
        {outdated
          ? 'Твой ник не подходит под новые правила рейтинга. Выбери другой, чтобы остаться в рейтинге.'
          : 'В рейтинг попадут только ник, XP, уровень и стрик. Выйти можно в настройках.'}
      </Text>
      <View style={styles.inputRow}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          value={nickname}
          onChangeText={t => {
            setNickname(t);
            setError(null);
          }}
          placeholder="nickname"
          placeholderTextColor={Colors.textDisabled}
          maxLength={NICKNAME_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          onSubmitEditing={join}
          returnKeyType="done"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Участвовать"
        icon="arrow-right"
        onPress={join}
        loading={saving}
        disabled={nickname.trim().length < NICKNAME_MIN}
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
  return (
    <View style={[styles.row, isYou && styles.rowYou]}>
      <Text style={[styles.rank, rank <= 3 && { color: Colors.accent }]}>{pad2(rank)}</Text>
      <View style={styles.flex}>
        <Text style={[styles.name, isYou && { color: Colors.accent }]} numberOfLines={1}>
          {player.nickname}
          {isYou ? ' · ты' : ''}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>lvl {player.level}</Text>
          <Icon name="flame" size={12} color={Colors.textMuted} />
          <Text style={styles.meta}>{player.streak}</Text>
        </View>
      </View>
      <Text style={[styles.xp, isYou && { color: Colors.accent }]}>
        {value} <Text style={styles.xpUnit}>xp</Text>
      </Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const today = useToday();
  const nickname = useUserStore(s => s.settings.nickname);
  const playerId = useUserStore(s => s.settings.playerId);
  const totalXp = useUserStore(s => s.progress.totalXp);
  const myWeekXp = useUserStore(s => weeklyXp(s.progress, today));
  const [mode, setMode] = useState<Mode>('week');
  const [players, setPlayers] = useState<PlayerEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const week = weekStart(today);
  const weekId = weekNumber(today);
  const load = useCallback(async () => {
    setError(false);
    try {
      setPlayers(await (mode === 'week' ? fetchWeek(weekId) : fetchAllTime()));
    } catch {
      setError(true);
    }
  }, [mode, weekId]);

  useEffect(() => {
    load();
  }, [load, nickname]);

  const refresh = async () => {
    setRefreshing(true);
    await publishScore().catch(() => {});
    await load();
    setRefreshing(false);
  };

  const daysLeft = daysBetween(today, addDays(week, 7));
  const ranked = players ? (mode === 'week' ? rankWeekly(players) : rankAllTime(players)) : [];
  // A nickname from an older version that the current rules reject must be replaced.
  const joined = !!nickname && validateNickname(nickname) === null;
  const myRank = ranked.findIndex(p => p.id === playerId) + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
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
                {m === 'week' ? 'неделя' : 'всё время'}
              </Text>
            </Pressable>
          ))}
        </View>
        {mode === 'week' && (
          <Label>
            {`сброс через ${daysLeft} ${plural(daysLeft, 'день', 'дня', 'дней')} · твой xp за неделю: ${myWeekXp}`}
          </Label>
        )}

        {!joined && <JoinCard outdated={!!nickname} />}
        {joined && myRank > 0 && (
          <Card tone="accent" style={styles.myRank}>
            <Text style={styles.myRankNumber}>#{myRank}</Text>
            <Text style={Type.small}>
              твоё место {mode === 'week' ? 'на этой неделе' : 'в общем зачёте'}
            </Text>
          </Card>
        )}

        {joined &&
          players !== null &&
          !error &&
          myRank === 0 &&
          (mode === 'week' ? myWeekXp : totalXp) > 0 && (
            <Text style={[Type.small, styles.empty]}>
              Твой результат ещё не попал в рейтинг. Проверь интернет и потяни экран вниз, чтобы
              отправить ещё раз.
            </Text>
          )}
        {players === null && !error && (
          <ActivityIndicator color={Colors.accent} style={styles.loader} />
        )}
        {error && (
          <Card tone="danger">
            <Text style={Type.h3}>Не удалось загрузить рейтинг</Text>
            <Text style={Type.small}>Проверь интернет и попробуй ещё раз.</Text>
            <Button
              title="Повторить"
              variant="secondary"
              icon="refresh-cw"
              onPress={load}
              style={styles.retry}
            />
          </Card>
        )}
        {players !== null && ranked.length === 0 && !error && (
          <Text style={[Type.small, styles.empty]}>
            {mode === 'week'
              ? 'На этой неделе ещё никто не занимался. Стань первым.'
              : 'Пока пусто.'}
          </Text>
        )}
        <View>
          {ranked.slice(0, 50).map((p, i) => (
            <Row
              key={p.id}
              rank={i + 1}
              player={p}
              value={mode === 'week' ? p.weekXp : p.xp}
              isYou={p.id === playerId}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surfaceRaised },
  tabText: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.textMuted },
  tabTextActive: { fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  join: { gap: Spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.codeBackground,
  },
  prompt: { fontFamily: Fonts.monoBold, fontSize: 15, color: Colors.accent },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontFamily: Fonts.mono,
    fontSize: 15,
    // The surrounding pill is the field; no browser focus ring on the web.
    outlineWidth: 0,
  },
  error: { fontFamily: Fonts.mono, color: Colors.danger, fontSize: 12 },
  myRank: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  myRankNumber: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
    color: Colors.textPrimary,
  },
  loader: { marginTop: Spacing.xxl },
  retry: { marginTop: Spacing.md },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowYou: { backgroundColor: Colors.surface },
  rank: { width: 26, fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.textMuted },
  flex: { flex: 1 },
  name: { fontFamily: Fonts.sansSemiBold, color: Colors.textPrimary, fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  xp: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.textPrimary },
  xpUnit: { color: Colors.textMuted, fontSize: 12 },
});
