import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Colors } from './theme';

export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${count} из 3 звёзд`}>
      {[0, 1, 2].map(i => (
        <Icon
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={size}
          color={i < count ? Colors.accent : Colors.textDisabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 1 } });
