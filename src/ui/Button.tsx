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
  primary: Colors.accent,
  success: Colors.success,
  danger: Colors.danger,
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
      ? Colors.textOnAccent
      : variant === 'ghost'
        ? Colors.textSecondary
        : Colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
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
    minHeight: 50,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  secondary: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  disabled: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  text: { fontFamily: Fonts.monoBold, fontSize: 15, letterSpacing: -0.2 },
});
