import type { ComponentType } from 'react';
import type {
  ChoiceQuestion as ChoiceQuestionT,
  OrderQuestion as OrderQuestionT,
  Question,
} from '../../content/schema';
import { ChoiceQuestion } from './questions/ChoiceQuestion';
import { OrderQuestion } from './questions/OrderQuestion';
import type { QuestionRegistry, QuestionTypeDef, QuestionViewProps } from './types';

function choice<Q extends ChoiceQuestionT>(
  defaultTitle: string,
  runnableCode: (question: Q) => string | null,
): QuestionTypeDef<Q, number> {
  return {
    defaultTitle,
    runnableCode,
    Component: ChoiceQuestion as ComponentType<QuestionViewProps<Q, number>>,
    initialAnswer: () => null,
    isCorrect: (q, a) => a === q.correct,
    correctAnswer: q => ({ text: q.options[q.correct] }),
    answerNote: (q, a) => q.optionExplanations?.[a] ?? null,
  };
}

/** Lines in the correct order, unless they are steps in prose rather than code. */
function orderCode(q: OrderQuestionT): string | null {
  if (q.lines.some(line => /^\s*[А-Яа-яЁё]/.test(line))) return null;
  return q.lines.join('\n');
}

export const QUESTION_TYPES: QuestionRegistry = {
  output: choice('Что выведет код?', q => q.code),
  trueFalse: choice('Верно или нет?', q => (q.code?.trim() ? q.code : null)),
  fill: choice('Заполни пропуск', q => q.codeBefore + q.options[q.correct] + q.codeAfter),
  order: {
    defaultTitle: 'Расставь строки по порядку',
    Component: OrderQuestion,
    initialAnswer: q => q.shuffled,
    isCorrect: (_q, a: number[]) => a.every((lineIndex, i) => lineIndex === i),
    correctAnswer: q => ({ code: q.lines.join('\n') }),
    runnableCode: orderCode,
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
