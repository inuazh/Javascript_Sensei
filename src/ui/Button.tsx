import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Colors, Fonts, Radius, Spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

const FILL: Partial<Record<Variant, string>> = {
  primary: Colors.inverse,
  success: Colors.inverse,
  danger: Colors.accent,
};
const TEXT_ON_FILL: Partial<Record<Variant, string>> = {
  primary: Colors.textOnInverse,
  success: Colors.textOnInverse,
  danger: Colors.textOnAccent,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  accessibilityHint,
}: ButtonProps) {
  const fill = FILL[variant];
  const textColor = disabled
    ? Colors.textDisabled
    : fill
      ? (TEXT_ON_FILL[variant] ?? Colors.textOnInverse)
      : variant === 'ghost'
        ? Colors.textSecondary
        : Colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      // The title stays the name while the spinner replaces it.
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fill ? { backgroundColor: fill } : null,
        variant === 'secondary' && styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
          {icon ? <Icon name={icon} size={17} color={textColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  disabled: { backgroundColor: Colors.surface, borderColor: Colors.surface },
  pressed: { opacity: 0.85 },
  text: { fontFamily: Fonts.sansSemiBold, fontSize: 16, letterSpacing: -0.2 },
});
