import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, alpha } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  color,
  style,
  accessibilityHint,
}: ButtonProps) {
  const accent =
    color ??
    (variant === 'success' ? Colors.success : variant === 'danger' ? Colors.danger : Colors.yellow);
  const filled = variant === 'primary' || variant === 'success' || variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        filled && { backgroundColor: accent },
        variant === 'secondary' && {
          backgroundColor: alpha(accent, 0.1),
          borderColor: alpha(accent, 0.35),
          borderWidth: 1,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? Colors.textOnAccent : accent} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: filled
                ? Colors.textOnAccent
                : variant === 'ghost'
                  ? Colors.textSecondary
                  : accent,
            },
            disabled && styles.textDisabled,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'transparent' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  textDisabled: { color: Colors.textDisabled },
});
