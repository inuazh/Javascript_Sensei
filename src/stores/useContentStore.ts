import { create } from 'zustand';
import { SECTION_FILES, loadSectionDefs } from '../../content';
import type { Lesson, SectionDef } from '../types/content';

export type { Topic, SectionDef, Question, Lesson } from '../types/content';

interface ContentState {
  sections: SectionDef[];
  topicToSection: Record<string, string>; // topicId -> sectionId
  lessons: Record<string, Lesson[]>; // topicId -> lessons
  loadedSections: Record<string, true>;
  currentLesson: Lesson | null;
  isLoaded: boolean;

  loadSections: () => Promise<void>;
  loadLessonsForSection: (sectionId: string) => Promise<void>;
  loadLessonsForTopic: (topicId: string) => Promise<void>;
  loadAllLessons: () => Promise<void>;
  getSectionIdForTopic: (topicId: string) => string | undefined;
  getLessonsForTopic: (topicId: string) => Lesson[];
  getLesson: (lessonId: string) => Lesson | undefined;
  setCurrentLesson: (lesson: Lesson | null) => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  sections: [],
  topicToSection: {},
  lessons: {},
  loadedSections: {},
  currentLesson: null,
  isLoaded: false,

  loadSections: async () => {
    if (get().isLoaded) return;
    try {
      const sections = loadSectionDefs();
      const topicToSection: Record<string, string> = {};
      for (const section of sections) {
        for (const topic of section.topics) topicToSection[topic.id] = section.id;
      }
      set({ sections, topicToSection, isLoaded: true });
    } catch (e) {
      console.error('Failed to load sections', e);
    }
  },

  loadLessonsForSection: async (sectionId: string) => {
    if (get().loadedSections[sectionId]) return;
    const loadFile = SECTION_FILES[sectionId];
    if (!loadFile) {
      console.warn(`No lesson file registered for section "${sectionId}" (see content/index.ts)`);
      return;
    }
    try {
      const data = loadFile();
      const newLessons: Record<string, Lesson[]> = {};
      for (const lesson of data.lessons) {
        if (!newLessons[lesson.topicId]) newLessons[lesson.topicId] = [];
        newLessons[lesson.topicId].push(lesson);
      }
      for (const list of Object.values(newLessons)) list.sort((a, b) => a.order - b.order);

      set(state => ({
        lessons: { ...state.lessons, ...newLessons },
        loadedSections: { ...state.loadedSections, [sectionId]: true },
      }));
    } catch (e) {
      console.error('Failed to load lessons for section', sectionId, e);
    }
  },

  loadLessonsForTopic: async (topicId: string) => {
    await get().loadSections();
    const sectionId = get().getSectionIdForTopic(topicId);
    if (!sectionId) {
      console.warn(`Topic "${topicId}" is not listed in content/sections.json`);
      return;
    }
    await get().loadLessonsForSection(sectionId);
  },

  loadAllLessons: async () => {
    await get().loadSections();
    for (const section of get().sections) {
      await get().loadLessonsForSection(section.id);
    }
  },

  getSectionIdForTopic: (topicId: string) => {
    return get().topicToSection[topicId];
  },

  getLessonsForTopic: (topicId: string) => {
    return get().lessons[topicId] || [];
  },

  getLesson: (lessonId: string) => {
    const all = Object.values(get().lessons).flat();
    return all.find(l => l.id === lessonId);
  },

  setCurrentLesson: (lesson) => {
    set({ currentLesson: lesson });
  },
}));
