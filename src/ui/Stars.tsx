import { StyleSheet, Text, View } from 'react-native';

export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${count} из 3 звёзд`}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={{ fontSize: size, opacity: i < count ? 1 : 0.18 }}>
          ⭐
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
