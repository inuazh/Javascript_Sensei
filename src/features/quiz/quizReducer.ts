/**
 * State machine of a quiz session:
 *   answering --CHECK--> revealed --NEXT--> answering (next question) | finished
 * Kept free of React so it can be unit-tested.
 */

export interface QuizAnswer {
  questionId: string;
  lessonId: string;
  correct: boolean;
}

export interface QuizItem<Q = unknown> {
  question: Q & { id: string };
  lessonId: string;
}

export interface QuizState {
  index: number;
  phase: 'answering' | 'revealed' | 'finished';
  answer: unknown;
  lastCorrect: boolean | null;
  answers: QuizAnswer[];
}

export type QuizAction =
  | { type: 'CHANGE'; answer: unknown }
  | { type: 'CHECK'; correct: boolean; item: QuizItem }
  | { type: 'NEXT'; total: number; initialAnswer: unknown };

export function initQuiz(initialAnswer: unknown): QuizState {
  return { index: 0, phase: 'answering', answer: initialAnswer, lastCorrect: null, answers: [] };
}

/**
 * Continues a session after `answers` were given (a saved lesson): the next
 * unanswered question, or finished if every question has an answer.
 * `initialAnswer` is the empty answer of question `answers.length`.
 */
export function restoreQuiz(
  answers: QuizAnswer[],
  total: number,
  initialAnswer: unknown,
): QuizState {
  if (answers.length === 0) return initQuiz(initialAnswer);
  if (answers.length >= total) {
    return {
      index: Math.max(0, total - 1),
      phase: 'finished',
      answer: null,
      lastCorrect: answers[answers.length - 1].correct,
      answers,
    };
  }
  return {
    index: answers.length,
    phase: 'answering',
    answer: initialAnswer,
    lastCorrect: null,
    answers,
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'CHANGE':
      return state.phase === 'answering' ? { ...state, answer: action.answer } : state;
    case 'CHECK':
      if (state.phase !== 'answering' || state.answer === null) return state;
      return {
        ...state,
        phase: 'revealed',
        lastCorrect: action.correct,
        answers: [
          ...state.answers,
          {
            questionId: action.item.question.id,
            lessonId: action.item.lessonId,
            correct: action.correct,
          },
        ],
      };
    case 'NEXT':
      if (state.phase !== 'revealed') return state;
      if (state.index + 1 >= action.total) return { ...state, phase: 'finished' };
      return {
        ...state,
        index: state.index + 1,
        phase: 'answering',
        answer: action.initialAnswer,
        lastCorrect: null,
      };
    default:
      return state;
  }
}
