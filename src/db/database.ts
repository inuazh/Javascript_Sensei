import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('js-sensei.db');
  }
  return db;
}

export function initDB(): void {
  const database = getDB();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS lesson_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      stars INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      time_spent_sec INTEGER NOT NULL,
      xp_earned INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_activity (
      date TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export interface LessonResultRow {
  lessonId: string;
  topicId: string;
  completedAt: string;
  stars: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSec: number;
  xpEarned: number;
}

export function saveLessonResult(result: LessonResultRow): void {
  const database = getDB();
  database.runSync(
    `INSERT INTO lesson_results
     (lesson_id, topic_id, completed_at, stars, correct_answers, total_questions, time_spent_sec, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    result.lessonId,
    result.topicId,
    result.completedAt,
    result.stars,
    result.correctAnswers,
    result.totalQuestions,
    result.timeSpentSec,
    result.xpEarned
  );
}

export function loadLessonResults(): LessonResultRow[] {
  const database = getDB();
  const rows = database.getAllSync<any>(
    `SELECT lesson_id, topic_id, completed_at, stars, correct_answers,
            total_questions, time_spent_sec, xp_earned
     FROM lesson_results ORDER BY completed_at DESC`
  );
  return rows.map(r => ({
    lessonId: r.lesson_id,
    topicId: r.topic_id,
    completedAt: r.completed_at,
    stars: r.stars,
    correctAnswers: r.correct_answers,
    totalQuestions: r.total_questions,
    timeSpentSec: r.time_spent_sec,
    xpEarned: r.xp_earned,
  }));
}

export function loadLessonResultsForTopic(topicId: string): LessonResultRow[] {
  const database = getDB();
  const rows = database.getAllSync<any>(
    `SELECT * FROM lesson_results WHERE topic_id = ? ORDER BY completed_at DESC`,
    topicId
  );
  return rows.map(r => ({
    lessonId: r.lesson_id,
    topicId: r.topic_id,
    completedAt: r.completed_at,
    stars: r.stars,
    correctAnswers: r.correct_answers,
    totalQuestions: r.total_questions,
    timeSpentSec: r.time_spent_sec,
    xpEarned: r.xp_earned,
  }));
}

export function getActivityHeatmap(): Record<string, number> {
  const database = getDB();
  const rows = database.getAllSync<{ completed_at: string }>(
    `SELECT completed_at FROM lesson_results ORDER BY completed_at ASC`
  );
  const map: Record<string, number> = {};
  for (const row of rows) {
    const date = row.completed_at.split('T')[0];
    map[date] = (map[date] || 0) + 1;
  }
  return map;
}
