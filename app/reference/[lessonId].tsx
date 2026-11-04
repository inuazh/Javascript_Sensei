import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLessonRef } from '../../src/content/repository';
import { TheoryBlocks } from '../../src/features/lesson/TheoryBlocks';
import { getTheoryIndex } from '../../src/features/reference/theoryIndex';
import { BackButton, Button, Colors, Label, Screen, Spacing, Type } from '../../src/ui';
import { useGoBack } from '../../src/hooks/useGoBack';

/** Read-only theory of one lesson, opened from «Справочник» or a topic. */
export default function ReferenceLessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const ref = useMemo(() => (lessonId ? getLessonRef(lessonId) : undefined), [lessonId]);
  const number = useMemo(
    () => getTheoryIndex().entries.find(e => e.lessonId === lessonId)?.number,
    [lessonId],
  );

  const theory = ref?.lesson.theory;
  if (!ref || !theory) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={Type.h2}>теория не найдена</Text>
        <Button title="назад" onPress={goBack} />
      </Screen>
    );
  }

  const { lesson, topic } = ref;
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button
            title="пройти урок"
            icon="arrow-right"
            onPress={() => router.push(`/lesson/${lesson.id}`)}
            accessibilityHint={`теория и ${lesson.questions.length} заданий`}
          />
        </View>
      }
    >
      <BackButton />
      <Label>{`справочник · ${number ? `${number} · ` : ''}${topic.title}`}</Label>
      <Text style={Type.h1}>{lesson.title}</Text>
      <TheoryBlocks theory={theory} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
