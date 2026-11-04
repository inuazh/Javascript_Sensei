import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, alpha } from './theme';

interface CardProps {
  children: ReactNode;
  /** Tints background and border with this colour. */
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Card({ children, color, onPress, style, accessibilityLabel }: CardProps) {
  const tint = color
    ? { backgroundColor: alpha(color, 0.07), borderColor: alpha(color, 0.2) }
    : undefined;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, tint, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, tint, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  pressed: { opacity: 0.8 },
});
