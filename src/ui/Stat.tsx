import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from './theme';

/** A big number with a caption, laid out in a row of equal tiles. */
export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** Row container for Stat tiles. */
export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, color: Colors.textPrimary },
  label: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
