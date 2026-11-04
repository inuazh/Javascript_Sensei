// Deep imports: each package's index requires every weight, which would bundle them all.
import { Doto_900Black } from '@expo-google-fonts/doto/900Black';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CodeRunnerHost } from '../src/services/codeRunner';
import { syncReminders } from '../src/services/notifications';
import { useUserStore, waitForHydration } from '../src/stores/useUserStore';
import { Colors } from '../src/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Doto_900Black,
    IBMPlexMono_400Regular,
    IBMPlexMono_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    const resync = () => {
      const { settings, progress } = useUserStore.getState();
      syncReminders(settings.reminder, progress);
    };
    waitForHydration().then(() => {
      setHydrated(true);
      resync();
    });
    // Reminders are scheduled for absolute times: reschedule after a time zone change.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && useUserStore.persist.hasHydrated()) resync();
    });
    return () => sub.remove();
  }, []);

  // A font that fails to load falls back to the system font rather than blocking the app.
  const ready = hydrated && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lesson/[lessonId]"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="review"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="daily"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="topic/[topicId]" />
        <Stack.Screen name="reference/index" />
        <Stack.Screen name="reference/[lessonId]" />
        <Stack.Screen name="placement" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy-policy" />
      </Stack>
      <CodeRunnerHost />
    </SafeAreaProvider>
  );
}
