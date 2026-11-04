import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { Colors, Type } from './theme';

/** Small uppercase section label with an optional red indicator dot. */
export function Label({
  children,
  style,
  dot,
}: {
  children: string;
  style?: TextStyle;
  dot?: boolean;
}) {
  return (
    <View style={styles.row}>
      {dot ? <View style={styles.dot} /> : null}
      <Text style={[Type.caption, style]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
});
