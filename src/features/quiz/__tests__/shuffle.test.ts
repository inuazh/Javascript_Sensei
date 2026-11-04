import { optionOrder } from '../shuffle';

describe('optionOrder', () => {
  it('returns a permutation of option indexes', () => {
    for (let k = 0; k < 50; k++) {
      expect([...optionOrder(['a', 'b', 'c', 'd'])].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('spreads the right answer over all positions', () => {
    const positions = new Set<number>();
    for (let k = 0; k < 200; k++) positions.add(optionOrder(['a', 'b', 'c', 'd']).indexOf(1));
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });

  it('keeps true/false in the natural order', () => {
    expect(optionOrder(['true', 'false'], () => 0)).toEqual([0, 1]);
  });
});
