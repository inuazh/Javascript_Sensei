import { useRouter } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { plural } from '../../src/domain/reminders';
import {
  searchTheory,
  type Snippet,
  type TheoryEntry,
  type TheoryHit,
} from '../../src/features/reference/search';
import { getTheoryIndex } from '../../src/features/reference/theoryIndex';
import {
  BackButton,
  Colors,
  Fonts,
  Icon,
  Label,
  Radius,
  Screen,
  Spacing,
  Type,
} from '../../src/ui';

const pad = (n: number) => String(n).padStart(2, '0');

interface TopicGroup {
  key: string;
  /** Set on the first topic of a section: the section header goes above it. */
  section: { number: number; title: string } | null;
  number: string;
  title: string;
  data: TheoryEntry[];
}

function groupByTopic(entries: readonly TheoryEntry[]): TopicGroup[] {
  const groups: TopicGroup[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last?.key === entry.topicId) {
      last.data.push(entry);
      continue;
    }
    const newSection = !last || last.data[0].sectionId !== entry.sectionId;
    groups.push({
      key: entry.topicId,
      section: newSection ? { number: entry.sectionNumber, title: entry.sectionTitle } : null,
      number: `${entry.sectionNumber}.${entry.topicNumber}`,
      title: entry.topicTitle,
      data: [entry],
    });
  }
  return groups;
}

export default function ReferenceScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => getTheoryIndex(), []);
  const groups = useMemo(() => groupByTopic(index.entries), [index]);
  const hits = useMemo(() => searchTheory(index, deferredQuery), [index, deferredQuery]);
  const searching = deferredQuery.trim().length > 0;
  const open = (lessonId: string) => router.push(`/reference/${lessonId}`);

  return (
    <Screen scroll={false} edges={['top', 'bottom']} contentStyle={styles.screen}>
      <View style={styles.head}>
        <BackButton />
        <Label>{`справочник · ${index.entries.length} ${plural(index.entries.length, 'урок', 'урока', 'уроков')}`}</Label>
        <Text style={Type.h1}>Справочник</Text>
        <View style={styles.inputRow}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="замыкание, map, this…"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Поиск по теории"
            style={styles.input}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Очистить поиск"
            >
              <Icon name="x" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : (
            <Icon name="search" size={18} color={Colors.textMuted} />
          )}
        </View>
      </View>

      {searching ? (
        <FlatList
          data={hits}
          keyExtractor={hit => hit.entry.lessonId}
          renderItem={({ item }) => <HitRow hit={item} onPress={() => open(item.entry.lessonId)} />}
          ListHeaderComponent={
            hits.length > 0 ? (
              <Label style={styles.listLabel}>
                {`найдено: ${hits.length} ${plural(hits.length, 'урок', 'урока', 'уроков')}`}
              </Label>
            ) : null
          }
          ListEmptyComponent={<Empty />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          style={styles.flex}
        />
      ) : (
        <SectionList
          sections={groups}
          keyExtractor={entry => entry.lessonId}
          renderSectionHeader={({ section }) => <TopicHeader group={section} />}
          renderItem={({ item }) => <LessonRow entry={item} onPress={() => open(item.lessonId)} />}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          style={styles.flex}
        />
      )}
    </Screen>
  );
}

function TopicHeader({ group }: { group: TopicGroup }) {
  return (
    <View>
      {group.section ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>{pad(group.section.number)}</Text>
          <Text style={[Type.h3, styles.flex]}>{group.section.title}</Text>
        </View>
      ) : null}
      <View style={styles.topicHeader}>
        <Text style={styles.number}>{group.number}</Text>
        <Text style={styles.topicTitle}>{group.title}</Text>
      </View>
    </View>
  );
}

function LessonRow({ entry, onPress }: { entry: TheoryEntry; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Теория: ${entry.lessonTitle}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.number}>{entry.number}</Text>
      <Text style={[styles.title, styles.flex]}>{entry.lessonTitle}</Text>
      <Icon name="chevron-right" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

function HitRow({ hit, onPress }: { hit: TheoryHit; onPress: () => void }) {
  const { entry, titleMatch, snippet } = hit;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Теория: ${entry.lessonTitle}, тема «${entry.topicTitle}»`}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Text style={styles.hitMeta} numberOfLines={1}>
        {`${entry.number} · ${entry.topicTitle}`}
      </Text>
      {titleMatch ? (
        <Highlighted snippet={titleMatch} style={styles.title} />
      ) : (
        <Text style={styles.title}>{entry.lessonTitle}</Text>
      )}
      {snippet ? (
        <Highlighted
          snippet={snippet}
          style={snippet.code ? styles.snippetCode : styles.snippet}
          numberOfLines={1}
        />
      ) : null}
    </Pressable>
  );
}

function Highlighted({
  snippet,
  style,
  numberOfLines,
}: {
  snippet: Snippet;
  style: TextStyle;
  numberOfLines?: number;
}) {
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {snippet.before}
      {snippet.match ? <Text style={styles.match}>{snippet.match}</Text> : null}
      {snippet.after}
    </Text>
  );
}

function Empty() {
  return (
    <View style={styles.empty} accessibilityLiveRegion="polite">
      <Icon name="search" size={28} color={Colors.textDisabled} />
      <Text style={Type.h3}>Ничего не нашлось</Text>
      <Text style={[Type.small, styles.emptyHint]}>
        Попробуй другое слово или его начало: «замык», «промис», «map».
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0, gap: 0 },
  head: { gap: Spacing.lg, paddingBottom: Spacing.lg },
  flex: { flex: 1 },
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
  },
  list: { paddingBottom: Spacing.xxxl },
  listLabel: { marginBottom: Spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderStrong,
  },
  sectionNumber: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.accent },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  topicTitle: { ...Type.caption, color: Colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surfaceRaised },
  number: { width: 44, fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  hit: {
    gap: 3,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  hitMeta: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  snippet: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  snippetCode: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 19, color: Colors.syntax.text },
  match: { color: Colors.accent },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xxxl },
  emptyHint: { textAlign: 'center' },
});
