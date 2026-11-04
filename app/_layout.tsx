import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncReminders } from '../src/services/notifications';
import { useUserStore, waitForHydration } from '../src/stores/useUserStore';
import { Colors } from '../src/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useNotificationNavigation() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useNotificationNavigation();

  useEffect(() => {
    waitForHydration().then(() => {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
      const { settings, progress } = useUserStore.getState();
      syncReminders(settings.reminder, progress);
    });
  }, []);

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
        <Stack.Screen name="topic/[topicId]" />
        <Stack.Screen name="placement" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy-policy" />
      </Stack>
    </SafeAreaProvider>
  );
}
