/**
 * Type definitions for JS Sensei app
 */

// Question Types
export enum QuestionType {
  OUTPUT = 'output',
  FILL = 'fill',
  TRUE_FALSE = 'trueFalse',
  ORDER = 'order',
}

export interface OutputQuestion {
  type: QuestionType.OUTPUT;
  id: string;
  text: string;
  code: string;
  expectedOutput: string;
  explanation?: string;
}

export interface FillQuestion {
  type: QuestionType.FILL;
  id: string;
  text: string;
  code: string;
  blanks: {
    index: number;
    answer: string;
    hints?: string[];
  }[];
  explanation?: string;
}

export interface TrueFalseQuestion {
  type: QuestionType.TRUE_FALSE;
  id: string;
  text: string;
  correct: boolean;
  explanation?: string;
}

export interface OrderQuestion {
  type: QuestionType.ORDER;
  id: string;
  text: string;
  items: {
    id: string;
    text: string;
  }[];
  correctOrder: string[];
  explanation?: string;
}

export type Question =
  | OutputQuestion
  | FillQuestion
  | TrueFalseQuestion
  | OrderQuestion;

// Lesson & Sections
export interface Lesson {
  id: string;
  title: string;
  description: string;
  topicId: string;
  sectionId: string;
  order: number;
  duration: number; // in minutes
  questions: Question[];
  content?: string; // Markdown content
  videoUrl?: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  color?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order: number;
  sections: Section[];
}

export interface SkillTree {
  topics: Topic[];
}

// User Progress & Results
export interface UserProgress {
  userId: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date string
  dailyGoalMinutes: number;
  freezesAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicProgress {
  topicId: string;
  userId: string;
  status: 'locked' | 'current' | 'done';
  bestStars: number;
  completedLessons: string[]; // lesson IDs
  earnedXp: number;
  updatedAt: string;
}

export interface LessonResult {
  id: string;
  userId: string;
  lessonId: string;
  topicId: string;
  completedAt: string; // ISO date string
  stars: 1 | 2 | 3;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSec: number;
  xpEarned: number;
}

// Achievements
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  condition: (userProgress: UserProgress, lessonResults: LessonResult[]) => boolean;
  reward?: {
    xp?: number;
    badges?: string[];
  };
}

// Daily Activity Tracking (for streaks)
export interface DailyActivity {
  [key: string]: boolean; // weekday: hasCompletedLesson
}

// Store state types
export interface UserState {
  userProgress: UserProgress | null;
  topicsProgress: Record<string, TopicProgress>;
  lessonResults: LessonResult[];
  isOnboarded: boolean;
  dailyActivity: DailyActivity;
  loading: boolean;
  error: string | null;
}

export interface ContentState {
  sections: Section[];
  topics: Topic[];
  currentLesson: Lesson | null;
  loading: boolean;
  error: string | null;
}
