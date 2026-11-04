/**
 * An unfinished lesson. It is saved after every checked answer, so a page
 * reload or the system killing the app continues at the next question instead
 * of starting the lesson again from the theory.
 *
 * There is at most one saved session: answering in another lesson replaces it.
 * A session is only resumed while it matches the lesson content question by
 * question and is fresh; otherwise the lesson simply starts over.
 *
 * Only the answers are saved, not the order of the options on screen: the
 * question to continue from has not been answered yet, so it is shuffled anew
 * like any question that is shown again.
 */
import type { AnswerRecord } from './review';

export interface LessonSessionAnswer {
  questionId: string;
  correct: boolean;
}

export interface LessonSession {
  lessonId: string;
  /** Question ids of the lesson when the session was saved, in order. */
  questionIds: string[];
  /** Answers given so far, one per question from the first. */
  answers: LessonSessionAnswer[];
  /** Index of the question to continue from (always answers.length). */
  index: number;
  /** ISO time of the last saved answer. */
  savedAt: string;
}

/** A session not touched for longer than this starts over. */
export const LESSON_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface LessonContent {
  id: string;
  questions: readonly { id: string }[];
}

/** The session to save after `answers` were given in `lesson`. */
export function createLessonSession(
  lesson: LessonContent,
  answers: readonly AnswerRecord[],
  now: Date,
): LessonSession {
  return {
    lessonId: lesson.id,
    questionIds: lesson.questions.map(q => q.id),
    answers: answers.map(({ questionId, correct }) => ({ questionId, correct })),
    index: answers.length,
    savedAt: now.toISOString(),
  };
}

/**
 * Answers to continue `lesson` with, or null when the saved session belongs to
 * another lesson, no longer matches the content, or is too old.
 */
export function resumeLessonSession(
  session: LessonSession | null,
  lesson: LessonContent,
  now: Date,
): AnswerRecord[] | null {
  if (!session || session.lessonId !== lesson.id) return null;
  const age = now.getTime() - new Date(session.savedAt).getTime();
  if (!(age <= LESSON_SESSION_MAX_AGE_MS)) return null;
  const ids = lesson.questions.map(q => q.id);
  const sameQuestions =
    ids.length === session.questionIds.length &&
    ids.every((id, i) => session.questionIds[i] === id);
  if (!sameQuestions || session.answers.length === 0 || session.index !== session.answers.length) {
    return null;
  }
  if (session.answers.some((a, i) => a.questionId !== ids[i])) return null;
  return session.answers.map(a => ({ ...a, lessonId: lesson.id }));
}
