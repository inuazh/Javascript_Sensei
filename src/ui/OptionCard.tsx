import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Colors, Fonts, Radius, Spacing } from './theme';

interface OptionCardProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ title, subtitle, icon, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={styles.iconBox}>
          <Icon
            name={icon}
            size={20}
            color={selected ? Colors.textPrimary : Colors.textSecondary}
          />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surface,
    backgroundColor: Colors.surface,
  },
  selected: { borderColor: Colors.textPrimary },
  pressed: { backgroundColor: Colors.surfaceRaised },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.textPrimary },
  subtitle: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.textPrimary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
});
