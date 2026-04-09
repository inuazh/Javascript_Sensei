import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useUserStore } from '../src/stores/useUserStore';

export default function Index() {
  const [hydrated, setHydrated] = useState(false);
  const isOnboarded = useUserStore(s => s.isOnboarded);

  useEffect(() => {
    // Wait for Zustand to rehydrate from AsyncStorage before redirecting
    const unsub = useUserStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (fast path), resolve immediately
    if (useUserStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FACC15" />
      </View>
    );
  }

  return <Redirect href={isOnboarded ? '/(tabs)' : '/onboarding'} />;
}
