import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from './theme';

/** The JS badge + wordmark. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="JS Sensei">
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.18 }]}>
        <Text style={[styles.badgeText, { fontSize: size * 0.42 }]}>JS</Text>
      </View>
      <Text style={[styles.word, { fontSize: size * 0.62 }]}>sensei</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: Colors.accent,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 3,
    paddingBottom: 1,
  },
  badgeText: { fontFamily: Fonts.monoBold, color: Colors.textOnAccent },
  word: { fontFamily: Fonts.monoBold, color: Colors.textPrimary, letterSpacing: -0.5 },
});
