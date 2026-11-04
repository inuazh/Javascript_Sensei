import type { FindBugQuestion } from '../../../content/schema';
import { QUESTION_TYPES, questionPreview, questionTitle } from '../registry';

// Question views use sound and haptics, which are not needed here.
jest.mock('../../../services/feedback', () => ({ useFeedback: () => ({}) }));

const findBug = (extra: Partial<FindBugQuestion> = {}): FindBugQuestion => ({
  id: 'demo-01-q6',
  type: 'findBug',
  code: '// sum\nconst a = 1;\nconst b = "2";\nconsole.log(a + b);',
  bugLine: 3,
  explanation: 'b is a string',
  ...extra,
});

describe('findBug question type', () => {
  const def = QUESTION_TYPES.findBug;

  it('accepts only the bug line', () => {
    const q = findBug();
    expect(def.initialAnswer(q)).toBeNull();
    expect(def.isCorrect(q, 3)).toBe(true);
    expect(def.isCorrect(q, 2)).toBe(false);
    expect(def.isCorrect(q, 4)).toBe(false);
  });

  it('shows the fixed code as the correct answer when there is one', () => {
    expect(def.correctAnswer(findBug())).toEqual({ text: 'строка 3' });
    const fixed = '// sum\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);';
    expect(def.correctAnswer(findBug({ fixed }))).toEqual({ code: fixed });
  });

  it('describes the chosen line for an error report', () => {
    expect(def.answerText(findBug(), 3)).toBe('строка 3: const b = "2";');
    expect(def.answerText(findBug(), 9)).toBe('строка 9');
  });

  it('has a default title and a preview', () => {
    expect(questionTitle(findBug())).toBe('найди строку с ошибкой');
    expect(questionTitle(findBug({ title: 'Где ошибка?' }))).toBe('Где ошибка?');
    expect(questionPreview(findBug())).toBe('// sum');
  });
});
