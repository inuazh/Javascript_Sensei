import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getStatsContent } from '../../content/repository';
import type { ProgressState } from '../../domain/progress';
import { plural } from '../../domain/reminders';
import { computeSectionStats, type SectionStats, type StatsInsight } from '../../domain/stats';
import { Card, Colors, Fonts, Label, ProgressBar, Spacing, Type, pad2 } from '../../ui';

const lessonsWord = (n: number) => plural(n, 'урок', 'урока', 'уроков');

function rowLabel(s: SectionStats): string {
  const parts = [
    `${s.title}: пройдено ${s.lessonsDone} из ${s.lessonsTotal} ${lessonsWord(s.lessonsTotal)}`,
  ];
  parts.push(s.percent === null ? 'точность пока не известна' : `точность ${s.percent}%`);
  if (s.low) parts.push('стоит подтянуть');
  if (s.inReview > 0) parts.push(`в повторении ${s.inReview}, выучено ${s.mastered}`);
  if (s.mistakes > 0) parts.push(`ошибок ${s.mistakes}`);
  return parts.join(', ');
}

function Insight({ insight }: { insight: StatsInsight }) {
  const { section } = insight;
  const label = insight.kind === 'weakest' ? 'подтянуть' : 'сильнее всего';
  return (
    <Text
      style={styles.insight}
      numberOfLines={1}
      accessibilityLabel={`${label}: ${section.title}, ${section.percent}%`}
    >
      {label}: <Text style={styles.insightTitle}>{section.title}</Text>
      {' · '}
      <Text style={[styles.insightPercent, insight.kind === 'weakest' && styles.lowText]}>
        {section.percent}%
      </Text>
    </Text>
  );
}

function SectionRow({ stats, onPress }: { stats: SectionStats; onPress: () => void }) {
  const topic = stats.weakestTopic?.title;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rowLabel(stats)}
      accessibilityHint={topic ? `открыть тему «${topic}»` : 'открыть раздел'}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.number}>{pad2(stats.number)}</Text>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {stats.title}
          </Text>
          <Text style={styles.count}>
            {stats.lessonsDone}/{stats.lessonsTotal}
          </Text>
        </View>
        <ProgressBar
          value={stats.lessonsTotal ? stats.lessonsDone / stats.lessonsTotal : 0}
          height={3}
        />
      </View>
      <View style={styles.accuracy}>
        {stats.low && <View style={styles.marker} />}
        {stats.percent === null ? (
          <Text style={styles.noData}>-</Text>
        ) : (
          <Text style={styles.percent}>
            {stats.percent}
            <Text style={styles.percentSign}>%</Text>
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** «По разделам» on the profile: progress and accuracy for every started section. */
export function SectionStatsCard({ lessons, review }: Pick<ProgressState, 'lessons' | 'review'>) {
  const router = useRouter();
  const summary = useMemo(
    () => computeSectionStats({ lessons, review }, getStatsContent()),
    [lessons, review],
  );
  const { started, notStartedCount, insight } = summary;

  return (
    <Card>
      <Label style={styles.mb}>по разделам</Label>
      {insight && <Insight insight={insight} />}
      {started.length === 0 ? (
        <Text style={Type.small}>пройди первый урок, и здесь появится статистика по разделам</Text>
      ) : (
        <View>
          {started.map(s => (
            <SectionRow
              key={s.sectionId}
              stats={s}
              onPress={() => s.focusTopicId && router.push(`/topic/${s.focusTopicId}`)}
            />
          ))}
        </View>
      )}
      {started.length > 0 && notStartedCount > 0 && (
        <Text style={styles.notStarted}>
          ещё не начато: {notStartedCount}{' '}
          {plural(notStartedCount, 'раздел', 'раздела', 'разделов')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  mb: { marginBottom: Spacing.md },
  insight: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  insightTitle: { fontFamily: Fonts.sansSemiBold, color: Colors.textPrimary },
  insightPercent: { fontFamily: Fonts.monoBold, color: Colors.textPrimary },
  lowText: { color: Colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surfaceRaised },
  number: { width: 20, fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  middle: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  title: { flex: 1, fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  count: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted },
  accuracy: {
    width: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  marker: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  percent: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28, color: Colors.textPrimary },
  percentSign: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted },
  noData: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.textMuted },
  notStarted: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
