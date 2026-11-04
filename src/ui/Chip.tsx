import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Colors, Fonts, Radius, Spacing } from './theme';

/** Compact stat: icon + monospace value, e.g. a flame and 13. */
export function Chip({
  icon,
  label,
  color = Colors.accent,
  muted,
  accessibilityLabel,
}: {
  icon?: IconName;
  label: string;
  color?: string;
  muted?: boolean;
  /** Spoken description, e.g. "Стрик: 3 дня"; the bare value means little on its own. */
  accessibilityLabel?: string;
}) {
  return (
    <View
      style={styles.chip}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
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
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  label: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 20 },
});
