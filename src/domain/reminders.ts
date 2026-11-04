/**
 * Plans local reminder notifications. Reminders are scheduled one by one for
 * the next days (not as a repeating trigger) so that a day with activity gets
 * no reminder and the text can mention the current streak.
 */
import { addDays, fromDayKey, toDayKey, type DayKey } from './dates';
import type { ProgressState } from './progress';
import { streakDeadline, viewStreak } from './streak';
import { countDue, type QuestionExists } from './review';

export const REMINDER_DAYS_AHEAD = 7;

export interface PlannedReminder {
  date: Date;
  title: string;
  body: string;
}

export function planReminders(
  progress: ProgressState,
  time: { hour: number; minute: number },
  now: Date,
  exists?: QuestionExists,
): PlannedReminder[] {
  const today = toDayKey(now);
  const activeToday = progress.streak.lastActiveDay === today;
  const streak = viewStreak(progress.streak, today);
  const deadline = streakDeadline(progress.streak);
  const dueCount = countDue(progress.review, today, exists);
  const reminders: PlannedReminder[] = [];

  for (let i = 0; i < REMINDER_DAYS_AHEAD; i++) {
    const day: DayKey = addDays(today, i);
    if (i === 0 && activeToday) continue;
    const date = fromDayKey(day);
    date.setHours(time.hour, time.minute, 0, 0);
    if (date.getTime() <= now.getTime()) continue;
    reminders.push({ date, ...reminderText(i, streak.days, day === deadline, dueCount) });
  }
  return reminders;
}

function reminderText(
  dayOffset: number,
  streakDays: number,
  isDeadline: boolean,
  dueCount: number,
): { title: string; body: string } {
  if (dayOffset <= 1 && streakDays > 0 && isDeadline) {
    return {
      title: `🔥 Стрик ${streakDays} ${plural(streakDays, 'день', 'дня', 'дней')} под угрозой`,
      body: 'Один урок — и серия продолжается. Это пара минут.',
    };
  }
  if (dayOffset === 0 && dueCount > 0) {
    return {
      title: '🧠 Пора повторить',
      body: `${dueCount} ${plural(dueCount, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут')} повторения. Закрепим?`,
    };
  }
  if (dayOffset >= 3) {
    return {
      title: '⚡ JavaScript скучает',
      body: 'Вернись на 5 минут — продолжим с того же места.',
    };
  }
  return {
    title: '⚡ Время JavaScript',
    body: 'Пять минут практики сегодня — и знания не выветрятся.',
  };
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
