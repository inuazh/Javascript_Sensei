import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, alpha } from './theme';

interface OptionCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  color = Colors.yellow,
}: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: color, backgroundColor: alpha(color, 0.08) },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <View style={styles.flex}>
        <Text style={[styles.title, selected && { color }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, selected && { borderColor: color, backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pressed: { opacity: 0.8 },
  icon: { fontSize: 24 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
});
