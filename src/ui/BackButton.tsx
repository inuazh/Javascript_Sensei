import { useGoBack } from '../hooks/useGoBack';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Colors } from './theme';

export function BackButton({ onPress }: { onPress?: () => void }) {
  const goBack = useGoBack();
  return (
    <Pressable
      onPress={onPress ?? goBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="назад"
      style={styles.button}
    >
      <Icon name="arrow-left" size={22} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { alignSelf: 'flex-start' } });
