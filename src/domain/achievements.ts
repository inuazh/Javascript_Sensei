/**
 * Achievements are declared in one place: what they look like, what they
 * reward and when they unlock. To add one, append an entry to ACHIEVEMENTS.
 */

export interface AchievementStats {
  lessonsCompleted: number;
  perfectLessons: number;
  streakDays: number;
  level: number;
  lessonsToday: number;
  /** Local hour (0-23) of the activity that triggered the check. */
  hour: number;
  /** Sections with every lesson completed. */
  sectionsCompleted: number;
  /** Sections with every lesson completed on 3 stars. */
  sectionsMastered: number;
  workoutsCompleted: number;
  /** Mistakes later fixed in a review workout. */
  mistakesFixed: number;
}

export type AchievementColor = 'yellow' | 'green' | 'blue' | 'orange' | 'pink' | 'purple' | 'red';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: AchievementColor;
  xpReward: number;
  unlocked: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    title: 'Первый шаг',
    description: 'Пройди первый урок',
    icon: '🎯',
    color: 'green',
    xpReward: 20,
    unlocked: s => s.lessonsCompleted >= 1,
  },
  {
    id: 'perfect_lesson',
    title: 'Без ошибок',
    description: 'Пройди урок без единой ошибки',
    icon: '💯',
    color: 'yellow',
    xpReward: 20,
    unlocked: s => s.perfectLessons >= 1,
  },
  {
    id: 'lessons_10',
    title: 'Втянулся',
    description: 'Пройди 10 уроков',
    icon: '📚',
    color: 'blue',
    xpReward: 30,
    unlocked: s => s.lessonsCompleted >= 10,
  },
  {
    id: 'perfect_10',
    title: 'Снайпер',
    description: '10 уроков без ошибок',
    icon: '🎯',
    color: 'red',
    xpReward: 50,
    unlocked: s => s.perfectLessons >= 10,
  },
  {
    id: 'lessons_50',
    title: 'Книжный червь',
    description: 'Пройди 50 уроков',
    icon: '🐛',
    color: 'purple',
    xpReward: 100,
    unlocked: s => s.lessonsCompleted >= 50,
  },
  {
    id: 'streak_3',
    title: 'Разгон',
    description: 'Занимайся 3 дня подряд',
    icon: '🔥',
    color: 'orange',
    xpReward: 20,
    unlocked: s => s.streakDays >= 3,
  },
  {
    id: 'streak_7',
    title: 'Неделя в деле',
    description: 'Занимайся 7 дней подряд',
    icon: '🔥',
    color: 'orange',
    xpReward: 50,
    unlocked: s => s.streakDays >= 7,
  },
  {
    id: 'streak_30',
    title: 'Железная дисциплина',
    description: 'Занимайся 30 дней подряд',
    icon: '💎',
    color: 'blue',
    xpReward: 200,
    unlocked: s => s.streakDays >= 30,
  },
  {
    id: 'section_complete',
    title: 'Раздел закрыт',
    description: 'Пройди все уроки одного раздела',
    icon: '🏁',
    color: 'green',
    xpReward: 50,
    unlocked: s => s.sectionsCompleted >= 1,
  },
  {
    id: 'section_master',
    title: 'Мастер раздела',
    description: 'Пройди все уроки раздела на 3 звезды',
    icon: '👑',
    color: 'yellow',
    xpReward: 100,
    unlocked: s => s.sectionsMastered >= 1,
  },
  {
    id: 'first_workout',
    title: 'Работа над ошибками',
    description: 'Заверши первую тренировку',
    icon: '🧠',
    color: 'pink',
    xpReward: 20,
    unlocked: s => s.workoutsCompleted >= 1,
  },
  {
    id: 'mistakes_25',
    title: 'Учусь на ошибках',
    description: 'Исправь 25 ошибок в тренировках',
    icon: '🛠️',
    color: 'pink',
    xpReward: 50,
    unlocked: s => s.mistakesFixed >= 25,
  },
  {
    id: 'speed_demon',
    title: 'Марафон',
    description: 'Пройди 5 уроков за день',
    icon: '💨',
    color: 'blue',
    xpReward: 30,
    unlocked: s => s.lessonsToday >= 5,
  },
  {
    id: 'night_owl',
    title: 'Сова',
    description: 'Позанимайся после 23:00',
    icon: '🌙',
    color: 'purple',
    xpReward: 10,
    unlocked: s => s.hour >= 23,
  },
  {
    id: 'early_bird',
    title: 'Жаворонок',
    description: 'Позанимайся до 7 утра',
    icon: '🌅',
    color: 'orange',
    xpReward: 10,
    unlocked: s => s.hour < 7,
  },
  {
    id: 'junior_dev',
    title: 'Junior Developer',
    description: 'Достигни звания Junior Dev',
    icon: '🌱',
    color: 'green',
    xpReward: 0,
    unlocked: s => s.level >= 6,
  },
  {
    id: 'middle_dev',
    title: 'Middle Developer',
    description: 'Достигни звания Middle Dev',
    icon: '🚀',
    color: 'blue',
    xpReward: 0,
    unlocked: s => s.level >= 10,
  },
  {
    id: 'senior_dev',
    title: 'Senior Developer',
    description: 'Достигни звания Senior Dev',
    icon: '🦾',
    color: 'purple',
    xpReward: 0,
    unlocked: s => s.level >= 14,
  },
  {
    id: 'js_sensei',
    title: 'JavaScript Sensei',
    description: 'Достигни высшего звания',
    icon: '⚡',
    color: 'yellow',
    xpReward: 0,
    unlocked: s => s.level >= 18,
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a]),
);

/** Achievements that are unlocked by `stats` and not in `alreadyUnlocked`. */
export function newlyUnlocked(
  stats: AchievementStats,
  alreadyUnlocked: Record<string, unknown>,
): Achievement[] {
  return ACHIEVEMENTS.filter(a => !(a.id in alreadyUnlocked) && a.unlocked(stats));
}
