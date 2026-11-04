import { XP, lessonResultXp, lessonXp, starsFor } from '../rewards';

describe('rewards', () => {
  it('gives stars by number of mistakes', () => {
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(4, 5)).toBe(2);
    expect(starsFor(3, 5)).toBe(1);
    expect(starsFor(0, 5)).toBe(1);
    expect(starsFor(0, 0)).toBe(0);
  });

  it('pays full XP for the first completion', () => {
    const perfect = 5 * XP.perCorrectAnswer + XP.lessonCompleted + XP.perfectLesson;
    expect(lessonXp(5, 5, null)).toBe(perfect);
    expect(lessonXp(3, 5, null)).toBe(3 * XP.perCorrectAnswer + XP.lessonCompleted);
  });

  it('pays only the improvement on replays', () => {
    expect(lessonXp(5, 5, 5)).toBe(0);
    expect(lessonXp(3, 5, 4)).toBe(0);
    expect(lessonXp(5, 5, 3)).toBe(lessonResultXp(5, 5) - lessonResultXp(3, 5));
  });

  it('cannot be farmed by replaying', () => {
    let best: number | null = null;
    let total = 0;
    for (let i = 0; i < 100; i++) {
      total += lessonXp(5, 5, best);
      best = 5;
    }
    expect(total).toBe(lessonResultXp(5, 5));
  });
});
