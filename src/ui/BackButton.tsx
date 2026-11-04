import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Colors } from './theme';

export function BackButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Назад"
      style={styles.button}
    >
      <Icon name="arrow-left" size={22} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { alignSelf: 'flex-start' } });
