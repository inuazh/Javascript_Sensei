import { AppState } from 'react-native';
import { watchToday } from '../useToday';

describe('watchToday', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('moves to the next day at midnight while the app stays open', () => {
    jest.setSystemTime(new Date(2026, 10, 4, 23, 58));
    const days: string[] = [];
    const stop = watchToday(day => days.push(day));
    expect(days.at(-1)).toBe('2026-11-04');

    jest.advanceTimersByTime(5 * 60_000);
    expect(days.at(-1)).toBe('2026-11-05');

    // And again the night after.
    jest.advanceTimersByTime(24 * 60 * 60_000);
    expect(days.at(-1)).toBe('2026-11-06');

    stop();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('checks the day when the app comes back to the foreground', () => {
    jest.setSystemTime(new Date(2026, 10, 4, 12, 0));
    const listen = jest.spyOn(AppState, 'addEventListener');
    const days: string[] = [];
    const stop = watchToday(day => days.push(day));
    const onChange = listen.mock.calls.at(-1)![1] as (state: string) => void;

    jest.setSystemTime(new Date(2026, 10, 7, 9, 0));
    onChange('active');
    expect(days.at(-1)).toBe('2026-11-07');
    stop();
    listen.mockRestore();
  });
});
