import { LEVEL_SKIPS, passedUnits, planPlacement, shouldStopPlacement } from '../placement';

const q = (id: string, type = 'fill') => ({ id, type });

describe('placement', () => {
  it('takes an output question from the last lesson of each section', () => {
    const items = planPlacement([
      {
        id: 's1',
        lessons: [
          { id: 'a', questions: [q('a1')] },
          { id: 'b', questions: [q('b1'), q('b2', 'output')] },
        ],
      },
      {
        id: 's2',
        lessons: [
          { id: 'c', questions: [q('c1')] },
          { id: 'd', questions: [] },
        ],
      },
      { id: 's3', lessons: [] },
    ]);
    expect(items.map(i => [i.unitId, i.lessonId, i.question.id])).toEqual([
      ['s1', 'b', 'b2'],
      ['s2', 'c', 'c1'],
    ]);
  });

  it('stops after three misses in a row', () => {
    const r = (correct: boolean) => ({ correct });
    expect(shouldStopPlacement([r(false), r(false)])).toBe(false);
    expect(shouldStopPlacement([r(true), r(false), r(false), r(false)])).toBe(true);
    expect(shouldStopPlacement([r(false), r(false), r(true)])).toBe(false);
  });

  it('returns passed sections', () => {
    const items = [
      { unitId: 's1', question: { id: 'x' } },
      { unitId: 's2', question: { id: 'y' } },
    ];
    expect(
      passedUnits(items, [
        { questionId: 'x', correct: true },
        { questionId: 'y', correct: false },
      ]),
    ).toEqual(['s1']);
  });

  it('skips more sections for higher levels, always from the start of the course', () => {
    expect(LEVEL_SKIPS.beginner).toEqual([]);
    expect(LEVEL_SKIPS.advanced.slice(0, LEVEL_SKIPS.intermediate.length)).toEqual(
      LEVEL_SKIPS.intermediate,
    );
  });
});
