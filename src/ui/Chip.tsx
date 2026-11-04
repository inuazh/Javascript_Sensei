import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Colors, Fonts, Radius, Spacing } from './theme';

/** Compact stat: icon + monospace value, e.g. a flame and 13. */
export function Chip({
  icon,
  label,
  color = Colors.accent,
  muted,
}: {
  icon?: IconName;
  label: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.chip}>
      {icon ? <Icon name={icon} size={15} color={muted ? Colors.textMuted : color} /> : null}
      <Text style={[styles.label, { color: muted ? Colors.textMuted : Colors.textPrimary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  label: { fontFamily: Fonts.monoBold, fontSize: 13 },
});
