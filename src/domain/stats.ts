/**
 * Learning statistics by section for the profile: how much of each section is
 * done, how accurately, what sits in review and which topic is the weakest.
 *
 * Content comes in as plain data so these rules stay free of React and of the
 * content repository, and are unit-tested on small fixtures.
 */
import type { LessonProgress, ProgressState } from './progress';
import type { ReviewItem } from './review';

/** A review item in this box or higher counts as mastered. */
export const MASTERED_BOX = 4;
/** Sections and the insight are flagged below this accuracy, in percent. */
export const LOW_ACCURACY_PERCENT = 70;
/** Taken lessons needed before the strongest/weakest section is named. */
export const MIN_LESSONS_FOR_INSIGHT = 3;

export interface StatsTopic {
  id: string;
  title: string;
  lessonIds: string[];
  questionIds: string[];
}

export interface StatsSection {
  id: string;
  title: string;
  topics: StatsTopic[];
}

/** Sections in course order → topics → lesson and question ids. */
export interface StatsContent {
  sections: StatsSection[];
}

/** Where a question or lesson lives in the course. */
export interface ContentPlace {
  sectionId: string;
  sectionTitle: string;
  /** 1-based position of the section in the course. */
  sectionNumber: number;
  topicId: string;
  topicTitle: string;
}

export interface ContentLookup {
  byQuestion: Map<string, ContentPlace>;
  byLesson: Map<string, ContentPlace>;
}

export function buildContentLookup(content: StatsContent): ContentLookup {
  const byQuestion = new Map<string, ContentPlace>();
  const byLesson = new Map<string, ContentPlace>();
  content.sections.forEach((section, i) => {
    for (const topic of section.topics) {
      const place: ContentPlace = {
        sectionId: section.id,
        sectionTitle: section.title,
        sectionNumber: i + 1,
        topicId: topic.id,
        topicTitle: topic.title,
      };
      for (const id of topic.lessonIds) byLesson.set(id, place);
      for (const id of topic.questionIds) byQuestion.set(id, place);
    }
  });
  return { byQuestion, byLesson };
}

/** The place of a review item: by its question, or by its lesson if the question moved. */
export function placeOf(
  lookup: ContentLookup,
  item: Pick<ReviewItem, 'questionId' | 'lessonId'>,
): ContentPlace | undefined {
  return lookup.byQuestion.get(item.questionId) ?? lookup.byLesson.get(item.lessonId);
}

export interface TopicStats {
  topicId: string;
  title: string;
  /** Taken lessons only; skipped ones have no answers. */
  lessonsTaken: number;
  /** 0..1, null without taken lessons. */
  accuracy: number | null;
  lapses: number;
}

export interface SectionStats {
  sectionId: string;
  title: string;
  /** 1-based position in the course. */
  number: number;
  /** Completed lessons, including the ones skipped by the placement test. */
  lessonsDone: number;
  lessonsTotal: number;
  /** Completed lessons that were actually taken (not skipped). */
  lessonsTaken: number;
  /** Best correct answers / questions over taken lessons, 0..1; null without data. */
  accuracy: number | null;
  /** `accuracy` rounded to whole percent, for display and the low-accuracy flag. */
  percent: number | null;
  /** percent < LOW_ACCURACY_PERCENT. */
  low: boolean;
  /** Questions of this section in spaced repetition. */
  inReview: number;
  /** Review questions in box MASTERED_BOX or higher. */
  mastered: number;
  /** Wrong answers over all review questions of the section. */
  mistakes: number;
  /** Lowest accuracy among topics with a taken lesson; ties → most lapses. */
  weakestTopic: TopicStats | null;
  /** Where tapping the section leads: the weakest topic, or the first one. */
  focusTopicId: string | null;
  /** Something was done here: a lesson completed or a question in review. */
  started: boolean;
}

export interface StatsInsight {
  kind: 'strongest' | 'weakest';
  section: SectionStats;
}

export interface SectionStatsSummary {
  sections: SectionStats[];
  started: SectionStats[];
  notStartedCount: number;
  /** Taken lessons across the course. */
  lessonsTaken: number;
  /** Highest accuracy; null below MIN_LESSONS_FOR_INSIGHT taken lessons. */
  strongest: SectionStats | null;
  /** Lowest accuracy, distinct from `strongest`; null with fewer than two such sections. */
  weakest: SectionStats | null;
  /** One line for the profile: what to tighten up, or else what is strongest. */
  insight: StatsInsight | null;
}

interface Tally {
  correct: number;
  questions: number;
  taken: number;
  lapses: number;
}

const emptyTally = (): Tally => ({ correct: 0, questions: 0, taken: 0, lapses: 0 });
const ratio = (t: Tally) => (t.taken > 0 && t.questions > 0 ? t.correct / t.questions : null);
const toPercent = (accuracy: number | null) =>
  accuracy === null ? null : Math.round(accuracy * 100);

function addLesson(tally: Tally, lesson: LessonProgress | undefined) {
  if (!lesson || lesson.skipped) return;
  tally.taken++;
  tally.correct += lesson.bestCorrect;
  tally.questions += lesson.total;
}

/** Lower accuracy first; equal accuracy → more lapses first. */
function weaker(a: { accuracy: number | null; lapses: number }, b: typeof a): boolean {
  if (a.accuracy === null) return false;
  if (b.accuracy === null) return true;
  return a.accuracy < b.accuracy || (a.accuracy === b.accuracy && a.lapses > b.lapses);
}

const asWeakness = (s: SectionStats) => ({ accuracy: s.accuracy, lapses: s.mistakes });

/** Higher accuracy first; ties → more taken lessons, then fewer mistakes. */
function stronger(a: SectionStats, b: SectionStats): boolean {
  const x = a.accuracy ?? -1;
  const y = b.accuracy ?? -1;
  if (x !== y) return x > y;
  if (a.lessonsTaken !== b.lessonsTaken) return a.lessonsTaken > b.lessonsTaken;
  return a.mistakes < b.mistakes;
}

/** The best item by `better`; the first one wins a full tie. */
function pick<T>(items: T[], better: (a: T, b: T) => boolean): T | null {
  let best: T | null = null;
  for (const item of items) if (!best || better(item, best)) best = item;
  return best;
}

export function computeSectionStats(
  progress: Pick<ProgressState, 'lessons' | 'review'>,
  content: StatsContent,
): SectionStatsSummary {
  const lookup = buildContentLookup(content);

  const reviewBySection = new Map<string, ReviewItem[]>();
  const lapsesByTopic = new Map<string, number>();
  for (const item of Object.values(progress.review)) {
    const place = placeOf(lookup, item);
    if (!place) continue;
    const list = reviewBySection.get(place.sectionId) ?? [];
    list.push(item);
    reviewBySection.set(place.sectionId, list);
    lapsesByTopic.set(place.topicId, (lapsesByTopic.get(place.topicId) ?? 0) + item.lapses);
  }

  const sections = content.sections.map((section, i): SectionStats => {
    const total = emptyTally();
    let lessonsDone = 0;
    let lessonsTotal = 0;
    let weakestTopic: TopicStats | null = null;

    for (const topic of section.topics) {
      const tally = emptyTally();
      for (const id of topic.lessonIds) {
        const lesson = progress.lessons[id];
        if (lesson) lessonsDone++;
        addLesson(tally, lesson);
      }
      lessonsTotal += topic.lessonIds.length;
      total.taken += tally.taken;
      total.correct += tally.correct;
      total.questions += tally.questions;

      const stats: TopicStats = {
        topicId: topic.id,
        title: topic.title,
        lessonsTaken: tally.taken,
        accuracy: ratio(tally),
        lapses: lapsesByTopic.get(topic.id) ?? 0,
      };
      if (stats.accuracy !== null && (!weakestTopic || weaker(stats, weakestTopic))) {
        weakestTopic = stats;
      }
    }

    const review = reviewBySection.get(section.id) ?? [];
    const accuracy = ratio(total);
    const percent = toPercent(accuracy);
    return {
      sectionId: section.id,
      title: section.title,
      number: i + 1,
      lessonsDone,
      lessonsTotal,
      lessonsTaken: total.taken,
      accuracy,
      percent,
      low: percent !== null && percent < LOW_ACCURACY_PERCENT,
      inReview: review.length,
      mastered: review.filter(r => r.box >= MASTERED_BOX).length,
      mistakes: review.reduce((sum, r) => sum + r.lapses, 0),
      weakestTopic,
      focusTopicId: weakestTopic?.topicId ?? section.topics[0]?.id ?? null,
      started: lessonsDone > 0 || review.length > 0,
    };
  });

  const started = sections.filter(s => s.started);
  const lessonsTaken = sections.reduce((sum, s) => sum + s.lessonsTaken, 0);
  const rated =
    lessonsTaken >= MIN_LESSONS_FOR_INSIGHT ? sections.filter(s => s.accuracy !== null) : [];

  const strongest = pick(rated, stronger);
  const weakest = pick(
    rated.filter(s => s !== strongest),
    (a, b) => weaker(asWeakness(a), asWeakness(b)),
  );

  const candidate = weakest ?? strongest;
  const insight: StatsInsight | null = !candidate
    ? null
    : candidate.low
      ? { kind: 'weakest', section: candidate }
      : { kind: 'strongest', section: strongest! };

  return {
    sections,
    started,
    notStartedCount: sections.length - started.length,
    lessonsTaken,
    strongest,
    weakest,
    insight,
  };
}
