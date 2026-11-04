import type { ComponentType } from 'react';
import type { ChoiceQuestion as ChoiceQuestionT, Question } from '../../content/schema';
import { ChoiceQuestion } from './questions/ChoiceQuestion';
import { FindBugQuestion } from './questions/FindBugQuestion';
import { OrderQuestion } from './questions/OrderQuestion';
import type { QuestionRegistry, QuestionTypeDef, QuestionViewProps } from './types';

function choice<Q extends ChoiceQuestionT>(defaultTitle: string): QuestionTypeDef<Q, number> {
  return {
    defaultTitle,
    Component: ChoiceQuestion as ComponentType<QuestionViewProps<Q, number>>,
    initialAnswer: () => null,
    isCorrect: (q, a) => a === q.correct,
    correctAnswer: q => ({ text: q.options[q.correct] }),
    answerNote: (q, a) => q.optionExplanations?.[a] ?? null,
  };
}

export const QUESTION_TYPES: QuestionRegistry = {
  output: choice('Что выведет код?'),
  trueFalse: choice('Верно или нет?'),
  fill: choice('Заполни пропуск'),
  order: {
    defaultTitle: 'Расставь строки по порядку',
    Component: OrderQuestion,
    initialAnswer: q => q.shuffled,
    isCorrect: (_q, a: number[]) => a.every((lineIndex, i) => lineIndex === i),
    correctAnswer: q => ({ code: q.lines.join('\n') }),
  },
  findBug: {
    defaultTitle: 'Найди строку с ошибкой',
    Component: FindBugQuestion,
    initialAnswer: () => null,
    isCorrect: (q, a: number) => a === q.bugLine,
    correctAnswer: q => (q.fixed ? { code: q.fixed } : { text: `Строка ${q.bugLine}` }),
  },
};

export function getQuestionType(question: Question): QuestionTypeDef<Question, unknown> {
  return QUESTION_TYPES[question.type] as QuestionTypeDef<Question, unknown>;
}

export function questionTitle(question: Question): string {
  return question.title ?? getQuestionType(question).defaultTitle;
}

/** One-line preview of a question (first code line or the title), for lists. */
export function questionPreview(question: Question): string {
  const code =
    question.type === 'order'
      ? question.lines[0]
      : question.type === 'fill'
        ? `${question.codeBefore}___${question.codeAfter}`
        : question.code;
  const firstLine = code
    ?.split('\n')
    .map(l => l.trim())
    .find(Boolean);
  return firstLine ?? questionTitle(question);
}
