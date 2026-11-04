import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toDayKey, type DayKey } from '../domain/dates';

/** Today's day key; updates when the app returns to the foreground on a new day. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setToday(toDayKey(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}
