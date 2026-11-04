import { passedTopics, planPlacement, shouldStopPlacement } from '../placement';

const q = (id: string, type = 'fill') => ({ id, type });

describe('placement', () => {
  it('takes an output question from the last lesson of each topic', () => {
    const items = planPlacement([
      {
        topicId: 't1',
        lessons: [
          { id: 'a', questions: [q('a1')] },
          { id: 'b', questions: [q('b1'), q('b2', 'output')] },
        ],
      },
      { topicId: 't2', lessons: [{ id: 'c', questions: [q('c1')] }] },
      { topicId: 't3', lessons: [] },
    ]);
    expect(items.map(i => [i.topicId, i.lessonId, i.question.id])).toEqual([
      ['t1', 'b', 'b2'],
      ['t2', 'c', 'c1'],
    ]);
  });

  it('stops after three misses in a row', () => {
    const r = (correct: boolean) => ({ correct });
    expect(shouldStopPlacement([r(false), r(false)])).toBe(false);
    expect(shouldStopPlacement([r(true), r(false), r(false), r(false)])).toBe(true);
    expect(shouldStopPlacement([r(false), r(false), r(true)])).toBe(false);
  });

  it('returns passed topics', () => {
    const items = [
      { topicId: 't1', question: { id: 'x' } },
      { topicId: 't2', question: { id: 'y' } },
    ];
    expect(
      passedTopics(items, [
        { questionId: 'x', correct: true },
        { questionId: 'y', correct: false },
      ]),
    ).toEqual(['t1']);
  });
});
