/**
 * Read-only access to the bundled learning content.
 * Content is static, so it is loaded lazily on first use and cached;
 * no store or async loading is needed.
 */
import { SECTION_FILES, loadSectionDefs } from '../../content';
import type { ContentIndex } from '../domain/progress';
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

export function getContentIndex(): ContentIndex {
  return {
    sections: getSections().map(s => ({
      id: s.id,
      lessonIds: getSectionLessons(s.id).map(l => l.id),
    })),
  };
}
