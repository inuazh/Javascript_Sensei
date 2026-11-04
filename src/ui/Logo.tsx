import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from './theme';

/** Dot-matrix wordmark with the red dot. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="JS Sensei">
      <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.1 }]}>JS SENSEI</Text>
      <View style={[styles.dot, { width: size * 0.32, height: size * 0.32, borderRadius: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  word: { fontFamily: Fonts.display, color: Colors.textPrimary, letterSpacing: 1 },
  dot: { backgroundColor: Colors.accent, marginBottom: 4 },
});
