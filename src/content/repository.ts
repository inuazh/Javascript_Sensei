/**
 * Read-only access to the bundled learning content.
 * Content is static, so it is loaded lazily on first use and cached;
 * no store or async loading is needed.
 */
import { SECTION_FILES, loadSectionDefs } from '../../content';
import { pickDailyQuestionId } from '../domain/daily';
import { LEVEL_SKIPS } from '../domain/placement';
import type { ExperienceLevel } from '../domain/settings';
import type { DayKey } from '../domain/dates';
import type { ContentIndex } from '../domain/progress';
import { buildContentLookup, type ContentLookup, type StatsContent } from '../domain/stats';
import type { Lesson, Question, SectionDef, Topic } from './schema';

export interface LessonRef {
  lesson: Lesson;
  topic: Topic;
  section: SectionDef;
}

let sectionsCache: SectionDef[] | null = null;
const lessonsBySection = new Map<string, Lesson[]>();
let questionIndex: Map<string, { question: Question; lesson: Lesson }> | null = null;
let lessonIndex: Map<string, LessonRef> | null = null;
let statsContent: StatsContent | null = null;
let contentLookup: ContentLookup | null = null;

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function getSections(): SectionDef[] {
  if (!sectionsCache) {
    sectionsCache = loadSectionDefs().map(s => ({ ...s, topics: [...s.topics].sort(byOrder) }));
  }
  return sectionsCache;
}

export function getSection(sectionId: string): SectionDef | undefined {
  return getSections().find(s => s.id === sectionId);
}

export function getSectionLessons(sectionId: string): Lesson[] {
  let lessons = lessonsBySection.get(sectionId);
  if (!lessons) {
    const load = SECTION_FILES[sectionId];
    if (!load) {
      console.warn(`No lesson file registered for section "${sectionId}" (see content/index.ts)`);
      return [];
    }
    lessons = [...load().lessons].sort(byOrder);
    lessonsBySection.set(sectionId, lessons);
  }
  return lessons;
}

export function getTopicLessons(topicId: string): Lesson[] {
  const section = getSections().find(s => s.topics.some(t => t.id === topicId));
  if (!section) return [];
  return getSectionLessons(section.id).filter(l => l.topicId === topicId);
}

function buildLessonIndex(): Map<string, LessonRef> {
  if (!lessonIndex) {
    lessonIndex = new Map();
    for (const section of getSections()) {
      for (const topic of section.topics) {
        for (const lesson of getTopicLessons(topic.id)) {
          lessonIndex.set(lesson.id, { lesson, topic, section });
        }
      }
    }
  }
  return lessonIndex;
}

/** All lessons in learning order: section → topic → lesson. */
export function getLessonPath(): LessonRef[] {
  return [...buildLessonIndex().values()];
}

export function getLessonRef(lessonId: string): LessonRef | undefined {
  return buildLessonIndex().get(lessonId);
}

/** The lesson after `lessonId` in learning order, if any. */
export function getNextLesson(lessonId: string): LessonRef | undefined {
  const path = getLessonPath();
  const i = path.findIndex(r => r.lesson.id === lessonId);
  return i >= 0 ? path[i + 1] : undefined;
}

/** First lesson in learning order that is not completed. */
export function getFirstUncompleted(
  isCompleted: (lessonId: string) => boolean,
): LessonRef | undefined {
  return getLessonPath().find(r => !isCompleted(r.lesson.id));
}

export function getQuestion(
  questionId: string,
): { question: Question; lesson: Lesson } | undefined {
  if (!questionIndex) {
    questionIndex = new Map();
    for (const { lesson } of getLessonPath()) {
      for (const question of lesson.questions) questionIndex.set(question.id, { question, lesson });
    }
  }
  return questionIndex.get(questionId);
}

/**
 * The question is in the bundled content. Review items and daily results keep
 * question ids from older content; pass this to the review functions so an
 * item whose question is gone is skipped instead of counted or asked.
 */
export function questionExists(questionId: string): boolean {
  return getQuestion(questionId) !== undefined;
}

export function getContentIndex(): ContentIndex {
  return {
    sections: getSections().map(s => ({
      id: s.id,
      lessonIds: getSectionLessons(s.id).map(l => l.id),
    })),
  };
}

/** Sections → topics → lesson and question ids, for the statistics in src/domain/stats. */
export function getStatsContent(): StatsContent {
  if (!statsContent) {
    statsContent = {
      sections: getSections().map(s => ({
        id: s.id,
        title: s.title,
        topics: s.topics.map(t => {
          const lessons = getTopicLessons(t.id);
          return {
            id: t.id,
            title: t.title,
            lessonIds: lessons.map(l => l.id),
            questionIds: lessons.flatMap(l => l.questions.map(q => q.id)),
          };
        }),
      })),
    };
  }
  return statsContent;
}

/** Section and topic of a question or lesson. */
export function getContentLookup(): ContentLookup {
  if (!contentLookup) contentLookup = buildContentLookup(getStatsContent());
  return contentLookup;
}

/** «Задача дня» for `day`: the same question on every device with this content. */
export function getDailyQuestion(day: DayKey): { question: Question; lesson: Lesson } | undefined {
  const candidates = getLessonPath().flatMap(({ lesson }) =>
    lesson.questions.map(q => ({ id: q.id, type: q.type })),
  );
  const id = pickDailyQuestionId(candidates, day);
  return id ? getQuestion(id) : undefined;
}

/** Lessons a self-assessed level marks as known, and the section the learner then starts with. */
export function getLevelPlacement(level: ExperienceLevel): {
  lessonIds: string[];
  startSection: SectionDef | undefined;
} {
  const skipped = new Set(LEVEL_SKIPS[level]);
  return {
    lessonIds: [...skipped].flatMap(id => getSectionLessons(id).map(l => l.id)),
    startSection: getSections().find(s => !skipped.has(s.id)),
  };
}
