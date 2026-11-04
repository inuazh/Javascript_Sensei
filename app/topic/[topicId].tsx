import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSections, getTopicLessons } from '../../src/content/repository';
import { plural } from '../../src/domain/reminders';
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
  pad2,
} from '../../src/ui';
import { useGoBack } from '../../src/hooks/useGoBack';

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const lessonsProgress = useUserStore(s => s.progress.lessons);

  const sections = getSections();
  const section = sections.find(s => s.topics.some(t => t.id === topicId));
  const topic = section?.topics.find(t => t.id === topicId);
  if (!section || !topic) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>тема не найдена</Text>
        <Button title="назад" onPress={goBack} />
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
      <Label>{`${pad2(sectionNumber)} · ${section.title}`}</Label>
      <Text style={Type.h1}>{topic.title}</Text>
      <Text style={styles.subtitle}>{topic.subtitle}</Text>

      <View style={styles.list}>
        {lessons.map((lesson, i) => {
          const p = lessonsProgress[lesson.id];
          const isNext = lesson.id === nextId;
          return (
            <View key={lesson.id} style={[styles.lesson, isNext && styles.lessonNext]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/lesson/${lesson.id}`)}
                style={({ pressed }) => [styles.lessonMain, pressed && styles.pressed]}
              >
                {/* The number sits above the title, not in a column beside it: at 320px
                    the column left titles like «деструктуризация» too narrow to fit. */}
                <View style={styles.flex}>
                  <Text style={[styles.number, (p || isNext) && { color: Colors.accent }]}>
                    {sectionNumber}.{topicNumber}.{i + 1}
                  </Text>
                  <Text style={styles.title}>{lesson.title}</Text>
                  <Text style={styles.meta}>
                    {lesson.questions.length}{' '}
                    {plural(lesson.questions.length, 'задание', 'задания', 'заданий')}
                    {p && p.attempts > 1 ? ` · попыток: ${p.attempts}` : ''}
                    {p?.skipped ? ' · знакомо' : ''}
                  </Text>
                </View>
                {p?.skipped ? null : p ? (
                  <Stars count={p.stars} size={12} />
                ) : isNext ? (
                  <Icon name="play" size={16} color={Colors.accent} />
                ) : null}
              </Pressable>
              {lesson.theory ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`теория урока «${lesson.title}»`}
                  onPress={() => router.push(`/reference/${lesson.id}`)}
                  style={({ pressed }) => [styles.theory, pressed && styles.pressed]}
                >
                  <Icon name="book-open" size={16} color={Colors.textSecondary} />
                  <Text style={styles.theoryText}>теория</Text>
                </Pressable>
              ) : null}
            </View>
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  lessonMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  theory: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  theoryText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textSecondary },
  lessonNext: { borderColor: Colors.accent },
  pressed: { backgroundColor: Colors.surfaceRaised },
  number: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  flex: { flex: 1 },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.textPrimary },
  meta: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
