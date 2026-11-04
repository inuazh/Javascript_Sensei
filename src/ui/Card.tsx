import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from './theme';

type Tone = 'default' | 'accent' | 'success' | 'danger' | 'info';

const BORDER: Record<Tone, string> = {
  default: Colors.surface,
  accent: Colors.accent,
  success: Colors.borderStrong,
  danger: Colors.danger,
  info: Colors.borderStrong,
};

interface CardProps {
  children: ReactNode;
  /** Border colour that marks the card's role; backgrounds stay neutral. */
  tone?: Tone;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Card({
  children,
  tone = 'default',
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const border = { borderColor: BORDER[tone] };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, border, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, border, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  pressed: { backgroundColor: Colors.surfaceRaised },
});
