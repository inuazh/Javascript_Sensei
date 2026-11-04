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
    expect(getLevelInfo(0)).toMatchObject({ level: 1, title: 'newbie', progress: 0 });
    expect(getLevelInfo(99).level).toBe(1);
    expect(getLevelInfo(100)).toMatchObject({ level: 2, minXp: 100, nextXp: 250 });
    expect(getLevelInfo(175).progress).toBeCloseTo(0.5);
    expect(getLevelInfo(xpForLevel(6)).title).toBe('junior dev');
    expect(getLevelInfo(xpForLevel(18)).title).toBe('JS Sensei');
    expect(getLevelInfo(-5).level).toBe(1);
  });

  it('agrees with counting levels one by one', () => {
    for (let xp = 0; xp <= 20_000; xp += 5) {
      let level = 1;
      while (xpForLevel(level + 1) <= xp) level++;
      expect(getLevelInfo(xp).level).toBe(level);
    }
  });

  it('handles huge and non-finite XP without hanging', () => {
    expect(getLevelInfo(1e300).level).toBe(getLevelInfo(Number.MAX_SAFE_INTEGER).level);
    expect(getLevelInfo(Number.MAX_SAFE_INTEGER).level).toBeGreaterThan(1000);
    expect(getLevelInfo(NaN)).toMatchObject({ level: 1, progress: 0 });
    expect(getLevelInfo(Infinity)).toMatchObject({ level: 1, progress: 0 });
  });
});
