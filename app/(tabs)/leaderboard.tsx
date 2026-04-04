import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LeaderboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Рейтинг</Text>
        <Text style={styles.sub}>Скоро — соревнуйся с друзьями</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
});
