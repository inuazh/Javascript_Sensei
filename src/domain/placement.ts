/**
 * Where a learner who already knows something starts.
 *
 * Two ways in: pick a level in onboarding (a fixed set of sections is marked
 * as known), or take the placement test: one hard question per section (from
 * the section's final lesson). Sections answered correctly are marked as
 * known. The test stops early after several misses in a row.
 */
import type { ExperienceLevel } from './settings';

export const STOP_AFTER_MISSES = 3;

/** Sections a self-assessed level skips, in course order. */
export const LEVEL_SKIPS: Record<ExperienceLevel, readonly string[]> = {
  beginner: [],
  intermediate: ['basics', 'control'],
  advanced: ['basics', 'control', 'collections', 'modern', 'strings'],
};

/** Rough length of the test, for the screens that offer it. */
export const PLACEMENT_MINUTES = 5;

export interface PlacementUnit<Q extends { id: string; type: string }> {
  /** Section id. */
  id: string;
  /** The section's lessons in course order. */
  lessons: { id: string; questions: Q[] }[];
}

export interface PlacementItem<Q> {
  unitId: string;
  lessonId: string;
  question: Q;
}

export function planPlacement<Q extends { id: string; type: string }>(
  units: PlacementUnit<Q>[],
): PlacementItem<Q>[] {
  const items: PlacementItem<Q>[] = [];
  for (const unit of units) {
    const last = [...unit.lessons].reverse().find(l => l.questions.length > 0);
    if (!last) continue;
    const question = last.questions.find(q => q.type === 'output') ?? last.questions[0];
    items.push({ unitId: unit.id, lessonId: last.id, question });
  }
  return items;
}

export function shouldStopPlacement(answers: { correct: boolean }[]): boolean {
  if (answers.length < STOP_AFTER_MISSES) return false;
  return answers.slice(-STOP_AFTER_MISSES).every(a => !a.correct);
}

/** Unit (section) ids whose question was answered correctly. */
export function passedUnits(
  items: { unitId: string; question: { id: string } }[],
  answers: { questionId: string; correct: boolean }[],
): string[] {
  const correct = new Set(answers.filter(a => a.correct).map(a => a.questionId));
  return items.filter(i => correct.has(i.question.id)).map(i => i.unitId);
}
