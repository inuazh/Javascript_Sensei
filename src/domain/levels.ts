/**
 * Levels grow by a steadily increasing amount of XP:
 * level 2 needs 100 XP, then each level needs 50 XP more than the previous one.
 */

export interface LevelInfo {
  level: number;
  title: string;
  /** Total XP at which this level starts. */
  minXp: number;
  /** Total XP at which the next level starts. */
  nextXp: number;
  /** 0..1 progress towards the next level. */
  progress: number;
}

const TITLES: { fromLevel: number; title: string }[] = [
  { fromLevel: 1, title: 'Newbie' },
  { fromLevel: 3, title: 'Beginner' },
  { fromLevel: 6, title: 'Junior Dev' },
  { fromLevel: 10, title: 'Middle Dev' },
  { fromLevel: 14, title: 'Senior Dev' },
  { fromLevel: 18, title: 'JS Sensei' },
];

/** Total XP needed to reach `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + 25 * n * (n - 1);
}

export function titleForLevel(level: number): string {
  let title = TITLES[0].title;
  for (const t of TITLES) if (level >= t.fromLevel) title = t.title;
  return title;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  // Clamped to safe integers: beyond them `level + 1 === level` and no loop ends.
  const xp = Number.isFinite(totalXp) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, totalXp)) : 0;
  // xpForLevel(n + 1) = 25n² + 75n: solved for n instead of counting levels one
  // by one, so a huge XP value (a corrupt save, a forged leaderboard entry)
  // cannot hang the app. The loops only correct floating-point rounding.
  let level = 1 + Math.max(0, Math.floor((Math.sqrt(5625 + 100 * xp) - 75) / 50));
  while (level > 1 && xpForLevel(level) > xp) level--;
  while (xpForLevel(level + 1) <= xp) level++;
  const minXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  return {
    level,
    title: titleForLevel(level),
    minXp,
    nextXp,
    progress: (xp - minXp) / (nextXp - minXp),
  };
}

/** Level-title milestones, used by achievements and the profile screen. */
export const TITLE_MILESTONES = TITLES;
