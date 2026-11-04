/**
 * Contact with the app's authors: the support address and the «ошибка в
 * задании?» report, which opens the user's mail app with a prefilled letter.
 * There is no backend: the letter is sent from the user's own mailbox.
 */
import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { showNotice } from './dialog';

/** The one address for support, privacy and error reports. */
export const SUPPORT_EMAIL = 'jssensei.app@gmail.com';

export interface QuestionReport {
  questionId: string;
  lessonId: string;
  /** The answer the user gave, in words. */
  answer: string;
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? 'неизвестна';
}

/** A mailto: link with the question details filled in and room for a comment. */
export function questionReportUrl(report: QuestionReport, version: string = appVersion()): string {
  // A multi-line answer (lines of code) starts on its own line.
  const answer = report.answer.includes('\n') ? `\n${report.answer}` : ` ${report.answer}`;
  const body = [
    `вопрос: ${report.questionId}`,
    `урок: ${report.lessonId}`,
    `версия приложения: ${version}`,
    `мой ответ:${answer}`,
    '',
    'что не так:',
    '',
    '',
  ]
    .join('\n')
    // Mail links want CRLF line breaks (RFC 6068), also inside the answer.
    .replace(/\r?\n/g, '\r\n');
  const subject = `ошибка в задании ${report.questionId}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Opens the mail app, or shows the address when there is no mail app to open. */
export async function reportQuestion(report: QuestionReport): Promise<void> {
  const url = questionReportUrl(report);
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Falls through to the notice below.
  }
  showNotice(
    'не удалось открыть почту',
    `напиши на ${SUPPORT_EMAIL} и укажи задание ${report.questionId}`,
  );
}
