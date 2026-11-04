import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toDayKey, type DayKey } from '../domain/dates';

/**
 * Today's day key. Updates at local midnight while the app stays open, and
 * when the app returns to the foreground on a new day.
 */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(toDayKey(now));
      // A second after the next local midnight; timers can fire a little early.
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 1000);
    };
    update();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return today;
}
