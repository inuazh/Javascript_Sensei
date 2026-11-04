import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toDayKey, type DayKey } from '../domain/dates';

/** Milliseconds from `now` to the next local midnight (DST-aware). */
function msToMidnight(now: Date): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Calls `onDay` with today's key now, at every midnight and whenever the app
 * returns to the foreground. Returns the function that stops watching.
 */
export function watchToday(onDay: (day: DayKey) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    clearTimeout(timer);
    const now = new Date();
    onDay(toDayKey(now));
    // A second past midnight, so a timer that fires a little early still sees the new day.
    timer = setTimeout(update, msToMidnight(now) + 1000);
  };
  update();
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') update();
  });
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}

/** Today's day key; changes at midnight while the app stays open, too. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()));
  useEffect(() => watchToday(setToday), []);
  return today;
}
