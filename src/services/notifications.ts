import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { questionExists } from '../content/repository';
import { planReminders } from '../domain/reminders';
import type { ProgressState } from '../domain/progress';
import type { ReminderSettings } from '../stores/useUserStore';

const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

let queue: Promise<void> = Promise.resolve();

/**
 * Replaces all scheduled reminders with a fresh plan. Call on app start,
 * after any learning activity and after reminder settings change.
 */
export function syncReminders(reminder: ReminderSettings, progress: ProgressState): Promise<void> {
  // Runs one sync at a time: overlapping cancel-then-schedule runs would duplicate reminders.
  queue = queue.then(() => scheduleReminders(reminder, progress));
  return queue;
}

async function scheduleReminders(
  reminder: ReminderSettings,
  progress: ProgressState,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!reminder.enabled) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Напоминания',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    for (const r of planReminders(progress, reminder, new Date(), questionExists)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.date,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    console.warn('Failed to schedule reminders', e);
  }
}
