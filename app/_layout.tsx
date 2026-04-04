import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useContentStore } from '../src/stores/useContentStore';
import { initDB } from '../src/db/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSections = useContentStore(s => s.loadSections);

  useEffect(() => {
    initDB();
    loadSections().catch(console.warn);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[topicId]" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
