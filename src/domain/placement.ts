/**
 * Placement test for learners who already know the basics: one hard question
 * per topic (from the topic's final lesson). Topics answered correctly are
 * marked as known. The test stops early after several misses in a row.
 */

export const STOP_AFTER_MISSES = 3;

export interface PlacementTopic<Q extends { id: string; type: string }> {
  topicId: string;
  lessons: { id: string; questions: Q[] }[];
}

export interface PlacementItem<Q> {
  topicId: string;
  lessonId: string;
  question: Q;
}

export function planPlacement<Q extends { id: string; type: string }>(
  topics: PlacementTopic<Q>[],
): PlacementItem<Q>[] {
  const items: PlacementItem<Q>[] = [];
  for (const topic of topics) {
    const last = topic.lessons[topic.lessons.length - 1];
    if (!last || last.questions.length === 0) continue;
    const question = last.questions.find(q => q.type === 'output') ?? last.questions[0];
    items.push({ topicId: topic.topicId, lessonId: last.id, question });
  }
  return items;
}

export function shouldStopPlacement(answers: { correct: boolean }[]): boolean {
  if (answers.length < STOP_AFTER_MISSES) return false;
  return answers.slice(-STOP_AFTER_MISSES).every(a => !a.correct);
}

/** Topic ids whose question was answered correctly. */
export function passedTopics(
  items: { topicId: string; question: { id: string } }[],
  answers: { questionId: string; correct: boolean }[],
): string[] {
  const correct = new Set(answers.filter(a => a.correct).map(a => a.questionId));
  return items.filter(i => correct.has(i.question.id)).map(i => i.topicId);
}
