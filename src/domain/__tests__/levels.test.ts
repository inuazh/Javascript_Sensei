import { getLevelInfo, xpForLevel } from '../levels';

describe('levels', () => {
  it('has growing XP steps', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(250);
    expect(xpForLevel(4)).toBe(450);
    for (let l = 2; l < 30; l++) {
      expect(xpForLevel(l + 1) - xpForLevel(l)).toBeGreaterThan(xpForLevel(l) - xpForLevel(l - 1));
    }
  });

  it('maps XP to level, title and progress', () => {
    expect(getLevelInfo(0)).toMatchObject({ level: 1, title: 'Newbie', progress: 0 });
    expect(getLevelInfo(99).level).toBe(1);
    expect(getLevelInfo(100)).toMatchObject({ level: 2, minXp: 100, nextXp: 250 });
    expect(getLevelInfo(175).progress).toBeCloseTo(0.5);
    expect(getLevelInfo(xpForLevel(6)).title).toBe('Junior Dev');
    expect(getLevelInfo(xpForLevel(18)).title).toBe('JS Sensei');
    expect(getLevelInfo(-5).level).toBe(1);
  });
});
