import { initQuiz, quizReducer, restoreQuiz, type QuizItem } from '../quizReducer';

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

describe('restoreQuiz', () => {
  const given = [
    { questionId: 'q1', lessonId: 'l1', correct: true },
    { questionId: 'q2', lessonId: 'l1', correct: false },
  ];

  it('continues at the first unanswered question', () => {
    const s = restoreQuiz(given, 5, [2, 0, 1]);
    expect(s).toEqual({
      index: 2,
      phase: 'answering',
      answer: [2, 0, 1],
      lastCorrect: null,
      answers: given,
    });
    const next = quizReducer(quizReducer(s, { type: 'CHANGE', answer: 1 }), {
      type: 'CHECK',
      correct: true,
      item: item('q3'),
    });
    expect(next.answers.map(a => a.questionId)).toEqual(['q1', 'q2', 'q3']);
  });

  it('is a new session without answers', () => {
    expect(restoreQuiz([], 5, null)).toEqual(initQuiz(null));
  });

  it('is finished when every question has an answer', () => {
    expect(restoreQuiz(given, 2, null)).toMatchObject({
      index: 1,
      phase: 'finished',
      answers: given,
    });
  });
});
