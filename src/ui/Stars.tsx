import { StyleSheet, View } from 'react-native';
import { Colors } from './theme';

/** Lesson result as three dots. */
export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  const d = Math.max(6, Math.round(size * 0.6));
  return (
    <View style={[styles.row, { gap: d * 0.5 }]} accessible accessibilityLabel={`${count} из 3`}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: i < count ? Colors.textPrimary : Colors.dotOff,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
