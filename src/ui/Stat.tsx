import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from './theme';

const VALUE_SIZE = 28;
const LABEL_SIZE = 11;
/** Advance width of one character as a share of the font size (Doto and IBM Plex Mono). */
const CHAR_WIDTH = 0.62;

/**
 * Largest size up to `max` at which `chars` monospace characters fit `width`.
 * Four tiles on a 320px screen, or a large system font, would otherwise break
 * «210» or «идеально» in the middle.
 */
function fitSize(max: number, chars: number, width: number, fontScale: number): number {
  if (width <= 0 || chars <= 0) return max;
  return Math.max(6, Math.min(max, Math.floor(width / (chars * CHAR_WIDTH * fontScale))));
}

/** A big number with a caption, laid out in a row of equal tiles. */
export function Stat({ value, label }: { value: number; label: string }) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const text = String(value);
  const valueSize = fitSize(VALUE_SIZE, text.length, width, fontScale);
  const labelSize = fitSize(LABEL_SIZE, label.length, width, fontScale);
  return (
    <View style={styles.stat}>
      <View onLayout={onLayout}>
        <Text
          style={[styles.value, { fontSize: valueSize, lineHeight: valueSize + 4 }]}
          numberOfLines={1}
        >
          {text}
        </Text>
        <Text style={[styles.label, { fontSize: labelSize }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
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
  value: {
    fontFamily: Fonts.display,
    fontSize: VALUE_SIZE,
    lineHeight: VALUE_SIZE + 4,
    color: Colors.textPrimary,
  },
  label: { fontFamily: Fonts.mono, fontSize: LABEL_SIZE, color: Colors.textMuted, marginTop: 2 },
});
