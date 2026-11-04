import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSections, getTopicLessons } from '../../src/content/repository';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  Button,
  Colors,
  Radius,
  Screen,
  Spacing,
  Stars,
  Type,
  alpha,
  getSectionColor,
} from '../../src/ui';

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const lessonsProgress = useUserStore(s => s.progress.lessons);

  const section = getSections().find(s => s.topics.some(t => t.id === topicId));
  const topic = section?.topics.find(t => t.id === topicId);
  if (!section || !topic) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>Тема не найдена</Text>
        <Button title="Назад" onPress={() => router.back()} />
      </Screen>
    );
  }

  const color = getSectionColor(section);
  const lessons = getTopicLessons(topic.id);
  const nextId = lessons.find(l => !(l.id in lessonsProgress))?.id;

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Text style={styles.back}>←</Text>
      </Pressable>
      <Text style={[Type.caption, { color }]}>
        {section.icon} {section.title}
      </Text>
      <Text style={Type.h1}>{topic.title}</Text>
      <Text style={Type.small}>{topic.subtitle}</Text>

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
                isNext && { borderColor: alpha(color, 0.5), backgroundColor: alpha(color, 0.07) },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.number,
                  { backgroundColor: p ? alpha(color, 0.2) : 'rgba(255,255,255,0.05)' },
                ]}
              >
                <Text
                  style={[styles.numberText, { color: p || isNext ? color : Colors.textMuted }]}
                >
                  {p ? '✓' : i + 1}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>{lesson.title}</Text>
                <Text style={Type.small}>
                  {lesson.questions.length} вопросов{lesson.theory ? ' · 📖 теория' : ''}
                  {p && p.attempts > 1 ? ` · попыток: ${p.attempts}` : ''}
                </Text>
              </View>
              {p?.skipped ? (
                <Text style={styles.known}>знакомо</Text>
              ) : p ? (
                <Stars count={p.stars} size={12} />
              ) : isNext ? (
                <Text style={[styles.go, { color }]}>Начать</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 24, color: Colors.textSecondary },
  list: { gap: Spacing.sm, marginTop: Spacing.md },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pressed: { opacity: 0.75 },
  number: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontWeight: '800', fontSize: 15 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  go: { fontWeight: '800', fontSize: 14 },
  known: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
});
