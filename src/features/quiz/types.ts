import type { ComponentType } from 'react';
import type { Question, QuestionType } from '../../content/schema';

export interface QuestionViewProps<Q extends Question = Question, A = unknown> {
  question: Q;
  answer: A | null;
  onChange: (answer: A) => void;
  /** The answer was checked: show right/wrong state, block input. */
  revealed: boolean;
}

export interface CorrectAnswerView {
  text?: string;
  code?: string;
}

/**
 * Everything the quiz needs to know about one question type.
 * To add a type: extend QuestionSchema in src/content/schema.ts, implement a
 * QuestionTypeDef and register it in ./registry.ts.
 */
export interface QuestionTypeDef<Q extends Question = Question, A = unknown> {
  defaultTitle: string;
  Component: ComponentType<QuestionViewProps<Q, A>>;
  initialAnswer: (question: Q) => A | null;
  isCorrect: (question: Q, answer: A) => boolean;
  /** The correct answer, shown after a wrong answer. */
  correctAnswer: (question: Q) => CorrectAnswerView;
  /** A note about the specific answer the user gave, if the content has one. */
  answerNote?: (question: Q, answer: A) => string | null;
  /** Complete code the user can run after answering, or null if there is none. */
  runnableCode: (question: Q) => string | null;
  /** The given answer in words, for an error report. */
  answerText: (question: Q, answer: A) => string;
}

export type QuestionOfType<T extends QuestionType> = Extract<Question, { type: T }>;

export type QuestionRegistry = {
  [T in QuestionType]: QuestionTypeDef<QuestionOfType<T>, any>;
};
