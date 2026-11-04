// jest.mock is hoisted above these imports.
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from '../notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

describe('requestNotificationPermission', () => {
  it('asks only when the permission is not granted yet', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);
    await expect(requestNotificationPermission()).resolves.toBe(true);
  });

  // Onboarding awaits this before saving: a rejection would leave the user
  // stuck on the last step, and the settings switch would reject unhandled.
  it('answers false instead of rejecting when the native call fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    mocked.requestPermissionsAsync.mockRejectedValueOnce(new Error('no current activity'));
    await expect(requestNotificationPermission()).resolves.toBe(false);

    mocked.getPermissionsAsync.mockRejectedValueOnce(new Error('module missing'));
    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});
