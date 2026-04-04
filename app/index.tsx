import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserStore } from '../src/stores/useUserStore';

export default function Index() {
  const isOnboarded = useUserStore(s => s.isOnboarded);

  // Debug: показываем что-то пока решается редирект
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 18 }}>JS Sensei loading...</Text>
      <Redirect href={isOnboarded ? '/(tabs)' : '/onboarding'} />
    </View>
  );
}
