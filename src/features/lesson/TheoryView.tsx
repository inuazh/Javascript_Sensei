import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theory } from '../../content/schema';
import { Button, Colors, Icon, Label, Screen, Spacing, Type } from '../../ui';
import { TheoryBlocks } from './TheoryBlocks';

interface TheoryViewProps {
  title: string;
  label: string;
  theory: Theory;
  onStart: () => void;
  onClose: () => void;
}

export function TheoryView({ title, label, theory, onStart, onClose }: TheoryViewProps) {
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button title="К практике" icon="arrow-right" onPress={onStart} />
        </View>
      }
    >
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        style={styles.close}
      >
        <Icon name="x" size={22} color={Colors.textMuted} />
      </Pressable>
      <Label>{`теория · ${label.toLowerCase()}`}</Label>
      <Text style={Type.h1}>{title}</Text>
      <TheoryBlocks theory={theory} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-start' },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
