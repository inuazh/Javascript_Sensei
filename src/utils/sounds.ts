import { useAudioPlayer } from 'expo-audio';

const correctSound = require('../../assets/correct.wav');
const wrongSound = require('../../assets/wrong.wav');

export function useAnswerSounds() {
  const correctPlayer = useAudioPlayer(correctSound);
  const wrongPlayer = useAudioPlayer(wrongSound);

  const playCorrect = () => {
    try {
      correctPlayer.seekTo(0);
      correctPlayer.play();
    } catch (e) { /* non-critical */ }
  };

  const playWrong = () => {
    try {
      wrongPlayer.seekTo(0);
      wrongPlayer.play();
    } catch (e) { /* non-critical */ }
  };

  return { playCorrect, playWrong };
}
