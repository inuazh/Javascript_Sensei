import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSections, getTopicLessons } from '../../src/content/repository';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  BackButton,
  Button,
  Colors,
  Fonts,
  Icon,
  Label,
  Radius,
  Screen,
  Spacing,
  Stars,
  Type,
} from '../../src/ui';

const pad = (n: number) => String(n).padStart(2, '0');

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const lessonsProgress = useUserStore(s => s.progress.lessons);

  const sections = getSections();
  const section = sections.find(s => s.topics.some(t => t.id === topicId));
  const topic = section?.topics.find(t => t.id === topicId);
  if (!section || !topic) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>Тема не найдена</Text>
        <Button title="Назад" onPress={() => router.back()} />
      </Screen>
    );
  }

  const lessons = getTopicLessons(topic.id);
  const nextId = lessons.find(l => !(l.id in lessonsProgress))?.id;
  const sectionNumber = sections.indexOf(section) + 1;
  const topicNumber = section.topics.indexOf(topic) + 1;

  return (
    <Screen edges={['top', 'bottom']}>
      <BackButton />
      <Label>{`${pad(sectionNumber)} · ${section.title.toLowerCase()}`}</Label>
      <Text style={Type.h1}>{topic.title}</Text>
      <Text style={styles.subtitle}>{topic.subtitle}</Text>

      <View style={styles.list}>
        {lessons.map((lesson, i) => {
          const p = lessonsProgress[lesson.id];
          const isNext = lesson.id === nextId;
          return (
            <Pressable
              key={lesson.id}
              accessibilityRole="button"
              onPress={() => router.push(`/lesson/${lesson.id}`)}
              style={({ pressed }) => [
                styles.lesson,
                isNext && styles.lessonNext,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.number, (p || isNext) && { color: Colors.accent }]}>
                {sectionNumber}.{topicNumber}.{i + 1}
              </Text>
              <View style={styles.flex}>
                <Text style={styles.title}>{lesson.title}</Text>
                <Text style={styles.meta}>
                  {lesson.questions.length} заданий{lesson.theory ? ' · теория' : ''}
                  {p && p.attempts > 1 ? ` · попыток: ${p.attempts}` : ''}
                </Text>
              </View>
              {p?.skipped ? (
                <Text style={styles.meta}>знакомо</Text>
              ) : p ? (
                <Stars count={p.stars} size={12} />
              ) : isNext ? (
                <Icon name="play" size={16} color={Colors.accent} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
  },
  list: { gap: Spacing.sm, marginTop: Spacing.md },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  lessonNext: { borderColor: Colors.accent },
  pressed: { backgroundColor: Colors.surfaceRaised },
  number: { width: 44, fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
  flex: { flex: 1 },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.textPrimary },
  meta: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
