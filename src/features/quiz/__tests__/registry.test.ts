import vm from 'node:vm';
import { SECTION_FILES } from '../../../../content';
import type { Question } from '../../../content/schema';
import { getQuestionType } from '../registry';

// The question components are not rendered here; skip their sound and haptics.
jest.mock('../../../services/feedback', () => ({ useFeedback: () => ({}) }));

const runnable = (q: Question) => getQuestionType(q).runnableCode(q);
const base = { id: 'q', explanation: 'e' };

describe('runnableCode', () => {
  it('runs the code of output and trueFalse questions', () => {
    expect(
      runnable({
        ...base,
        type: 'output',
        code: 'console.log(1)',
        options: ['1', '2'],
        correct: 0,
      }),
    ).toBe('console.log(1)');
    expect(
      runnable({ ...base, type: 'trueFalse', code: '1 < 2', options: ['Да', 'Нет'], correct: 0 }),
    ).toBe('1 < 2');
  });

  it('has nothing to run for a trueFalse question without code', () => {
    expect(runnable({ ...base, type: 'trueFalse', options: ['Да', 'Нет'], correct: 0 })).toBeNull();
    expect(
      runnable({ ...base, type: 'trueFalse', code: '  ', options: ['Да', 'Нет'], correct: 0 }),
    ).toBeNull();
  });

  it('fills the gap with the correct option', () => {
    const q: Question = {
      ...base,
      type: 'fill',
      codeBefore: 'console.log(',
      codeAfter: ' true);',
      options: ['typeof', 'void'],
      correct: 0,
    };
    expect(runnable(q)).toBe('console.log(typeof true);');
  });

  it('puts order lines in the correct order, but not steps written in prose', () => {
    const code: Question = {
      ...base,
      type: 'order',
      lines: ['let a = 1;', '  a++;', 'console.log(a);'],
      shuffled: [2, 0, 1],
    };
    expect(runnable(code)).toBe('let a = 1;\n  a++;\nconsole.log(a);');
    const prose: Question = {
      ...base,
      type: 'order',
      lines: ['Выполняется синхронный код', 'Выполняются микрозадачи'],
      shuffled: [1, 0],
    };
    expect(runnable(prose)).toBeNull();
  });

  it('builds code that compiles for every fill and order question in the content', () => {
    const broken: string[] = [];
    for (const load of Object.values(SECTION_FILES)) {
      for (const lesson of load().lessons) {
        for (const q of lesson.questions) {
          if (q.type !== 'fill' && q.type !== 'order') continue;
          const code = runnable(q);
          if (code === null) continue;
          try {
            new vm.Script(code);
          } catch (e) {
            broken.push(`${q.id}: ${(e as Error).message}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
