import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useUserStore } from '../stores/useUserStore';

const correctSound = require('../../assets/correct.wav');
const wrongSound = require('../../assets/wrong.wav');

/** Sound and haptic feedback that respects the user's settings. */
export function useFeedback() {
  const soundEnabled = useUserStore(s => s.settings.soundEnabled);
  const hapticsEnabled = useUserStore(s => s.settings.hapticsEnabled);
  const correctPlayer = useAudioPlayer(correctSound);
  const wrongPlayer = useAudioPlayer(wrongSound);

  const play = useCallback(
    (player: typeof correctPlayer) => {
      if (!soundEnabled) return;
      try {
        // seekTo is async: its rejection would escape the try block.
        player.seekTo(0).catch(() => {});
        player.play();
      } catch {
        // Sound is decorative; ignore playback errors.
      }
    },
    [soundEnabled],
  );

  const haptic = useCallback(
    (fn: () => Promise<void>) => {
      if (hapticsEnabled) fn().catch(() => {});
    },
    [hapticsEnabled],
  );

  return {
    tap: useCallback(() => haptic(() => Haptics.selectionAsync()), [haptic]),
    success: useCallback(() => {
      play(correctPlayer);
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }, [play, haptic, correctPlayer]),
    error: useCallback(() => {
      play(wrongPlayer);
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    }, [play, haptic, wrongPlayer]),
    celebrate: useCallback(
      () => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      [haptic],
    ),
  };
}
