import type { ComponentType } from 'react';
import type {
  ChoiceQuestion as ChoiceQuestionT,
  OrderQuestion as OrderQuestionT,
  Question,
} from '../../content/schema';
import { ChoiceQuestion } from './questions/ChoiceQuestion';
import { FindBugQuestion } from './questions/FindBugQuestion';
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
    answerText: (q, a) => q.options[a] ?? String(a),
  };
}

/** Lines in the correct order, unless they are steps in words rather than code. */
function orderCode(q: OrderQuestionT): string | null {
  return q.steps || q.noRun ? null : q.lines.join('\n');
}

export const QUESTION_TYPES: QuestionRegistry = {
  output: choice('что выведет код?', q => q.code),
  trueFalse: choice('верно или нет?', q => (q.code?.trim() ? q.code : null)),
  fill: choice('заполни пропуск', q => q.codeBefore + q.options[q.correct] + q.codeAfter),
  order: {
    defaultTitle: 'расставь строки по порядку',
    Component: OrderQuestion,
    initialAnswer: q => q.shuffled,
    isCorrect: (_q, a: number[]) => a.every((lineIndex, i) => lineIndex === i),
    correctAnswer: q => ({ code: q.lines.join('\n') }),
    runnableCode: orderCode,
    answerText: (q, a: number[]) => a.map(i => q.lines[i] ?? String(i)).join('\n'),
  },
  findBug: {
    defaultTitle: 'найди строку с ошибкой',
    Component: FindBugQuestion,
    initialAnswer: () => null,
    isCorrect: (q, a: number) => a === q.bugLine,
    correctAnswer: q => (q.fixed ? { code: q.fixed } : { text: `строка ${q.bugLine}` }),
    // Run the buggy code: seeing the wrong output is the point of the question.
    runnableCode: q => q.code,
    answerText: (q, a: number) => {
      const line = q.code.split('\n')[a - 1]?.trim();
      return line ? `строка ${a}: ${line}` : `строка ${a}`;
    },
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
