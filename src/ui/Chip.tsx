import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius, Spacing, alpha } from './theme';

/** Small pill with an icon and a value, e.g. 🔥 5. */
export function Chip({
  icon,
  label,
  color = Colors.yellow,
  muted,
}: {
  icon?: string;
  label: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: alpha(color, muted ? 0.04 : 0.1),
          borderColor: alpha(color, muted ? 0.1 : 0.25),
        },
      ]}
    >
      {icon ? <Text style={[styles.icon, muted && styles.mutedIcon]}>{icon}</Text> : null}
      <Text style={[styles.label, { color: muted ? Colors.textMuted : color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  icon: { fontSize: 13 },
  mutedIcon: { opacity: 0.4 },
  label: { fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700' },
});
