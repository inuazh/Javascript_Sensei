/**
 * Gamification constants for XP, levels, and achievements
 */

// XP Constants
export const XP_PER_CORRECT_ANSWER = 15;
export const XP_LESSON_COMPLETE_BONUS = 25;
export const XP_PERFECT_LESSON_BONUS = 50;
export const XP_DAILY_CHALLENGE = 100;

// Level Definitions
export interface Level {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Newbie', minXp: 0, maxXp: 199 },
  { level: 4, title: 'Beginner', minXp: 200, maxXp: 599 },
  { level: 7, title: 'Junior Dev', minXp: 600, maxXp: 1499 },
  { level: 11, title: 'Middle Dev', minXp: 1500, maxXp: 3499 },
  { level: 16, title: 'Senior Dev', minXp: 3500, maxXp: 6999 },
  { level: 21, title: 'JS Sensei', minXp: 7000, maxXp: Infinity },
];

// Achievement Definitions
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  xpReward?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    title: 'Getting Started',
    description: 'Complete your first lesson',
    xpReward: 50,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    xpReward: 100,
  },
  {
    id: 'streak_30',
    title: 'Consistency Champion',
    description: 'Maintain a 30-day streak',
    xpReward: 250,
  },
  {
    id: 'perfect_lesson',
    title: 'Perfect Score',
    description: 'Complete a lesson with all correct answers',
    xpReward: 75,
  },
  {
    id: 'all_stars',
    title: 'Star Collector',
    description: 'Earn 100 stars across all lessons',
    xpReward: 150,
  },
  {
    id: 'junior_dev',
    title: 'Junior Developer',
    description: 'Reach Junior Dev level',
    xpReward: 0,
  },
  {
    id: 'middle_dev',
    title: 'Middle Developer',
    description: 'Reach Middle Dev level',
    xpReward: 0,
  },
  {
    id: 'senior_dev',
    title: 'Senior Developer',
    description: 'Reach Senior Dev level',
    xpReward: 0,
  },
  {
    id: 'js_sensei',
    title: 'JavaScript Sensei',
    description: 'Reach the highest level: JS Sensei',
    xpReward: 0,
  },
  {
    id: 'section_master',
    title: 'Section Master',
    description: 'Complete all lessons in a section with 3 stars',
    xpReward: 200,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete 5 lessons in one day',
    xpReward: 100,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 10 PM',
    xpReward: 30,
  },
];

/**
 * Get the level object for a given XP amount
 */
export function getLevelForXp(xp: number): Level {
  const level = LEVELS.find((level) => xp >= level.minXp && xp <= level.maxXp);
  return level || LEVELS[LEVELS.length - 1];
}

/**
 * Get the level number (0-based index) for a given XP amount
 */
export function getLevelNumberForXp(xp: number): number {
  const levelIndex = LEVELS.findIndex(
    (level) => xp >= level.minXp && xp <= level.maxXp
  );
  return levelIndex >= 0 ? levelIndex : LEVELS.length - 1;
}

/**
 * Get XP needed to reach the next level
 */
export function getXpToNextLevel(currentXp: number): number {
  const currentLevelIndex = getLevelNumberForXp(currentXp);

  if (currentLevelIndex >= LEVELS.length - 1) {
    // Already at max level
    return 0;
  }

  const nextLevel = LEVELS[currentLevelIndex + 1];
  return nextLevel.minXp - currentXp;
}

/**
 * Calculate stars for a lesson based on correct answers
 * 3 stars = all correct
 * 2 stars = max 1 error
 * 1 star = completed but has errors
 */
export function getStarsForLesson(
  correctAnswers: number,
  totalQuestions: number
): 1 | 2 | 3 {
  if (correctAnswers === totalQuestions) {
    return 3;
  }

  const errors = totalQuestions - correctAnswers;
  if (errors === 1) {
    return 2;
  }

  return 1;
}

/**
 * Calculate XP earned for a lesson
 */
export function calculateLessonXp(
  correctAnswers: number,
  totalQuestions: number
): number {
  let xp = 0;

  // XP for correct answers
  xp += correctAnswers * XP_PER_CORRECT_ANSWER;

  // Completion bonus
  xp += XP_LESSON_COMPLETE_BONUS;

  // Perfect lesson bonus
  if (correctAnswers === totalQuestions) {
    xp += XP_PERFECT_LESSON_BONUS;
  }

  return xp;
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((ach) => ach.id === id);
}
