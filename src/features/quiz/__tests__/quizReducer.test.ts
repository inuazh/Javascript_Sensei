import { initQuiz, quizReducer, type QuizItem } from '../quizReducer';

const item = (id: string): QuizItem => ({ question: { id }, lessonId: 'l1' });

describe('quizReducer', () => {
  it('runs answering → revealed → next → finished', () => {
    let s = initQuiz(null);
    s = quizReducer(s, { type: 'CHECK', correct: true, item: item('q1') });
    expect(s.phase).toBe('answering'); // cannot check without an answer

    s = quizReducer(s, { type: 'CHANGE', answer: 2 });
    s = quizReducer(s, { type: 'CHECK', correct: false, item: item('q1') });
    expect(s).toMatchObject({ phase: 'revealed', lastCorrect: false });
    expect(s.answers).toEqual([{ questionId: 'q1', lessonId: 'l1', correct: false }]);

    s = quizReducer(s, { type: 'CHANGE', answer: 1 });
    expect(s.answer).toBe(2); // answer is locked after checking

    s = quizReducer(s, { type: 'NEXT', total: 2, initialAnswer: [0, 1] });
    expect(s).toMatchObject({ index: 1, phase: 'answering', answer: [0, 1], lastCorrect: null });

    s = quizReducer(s, { type: 'CHECK', correct: true, item: item('q2') });
    s = quizReducer(s, { type: 'NEXT', total: 2, initialAnswer: null });
    expect(s.phase).toBe('finished');
    expect(s.answers.map(a => a.correct)).toEqual([false, true]);
  });

  it('ignores NEXT before checking', () => {
    const s = quizReducer(initQuiz(1), { type: 'NEXT', total: 3, initialAnswer: null });
    expect(s.index).toBe(0);
  });
});
