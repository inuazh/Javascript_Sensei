import { create } from 'zustand';

export interface Topic {
  id: string;
  title: string;
  subtitle: string;
  order: number;
}

export interface SectionDef {
  id: string;
  title: string;
  icon: string;
  color: string;
  order: number;
  topics: Topic[];
}

export interface Question {
  id: string;
  type: 'output' | 'fill' | 'trueFalse' | 'order';
  title: string;
  code?: string;
  codeBefore?: string;
  codeAfter?: string;
  options?: string[];
  correct?: number;
  lines?: string[];
  shuffled?: number[];
  explanation: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  order: number;
  questions: Question[];
}

interface ContentState {
  sections: SectionDef[];
  lessons: Record<string, Lesson[]>; // topicId -> lessons
  currentLesson: Lesson | null;
  isLoaded: boolean;

  loadSections: () => Promise<void>;
  loadLessonsForSection: (sectionId: string) => Promise<void>;
  getLessonsForTopic: (topicId: string) => Lesson[];
  getLesson: (lessonId: string) => Lesson | undefined;
  setCurrentLesson: (lesson: Lesson | null) => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  sections: [],
  lessons: {},
  currentLesson: null,
  isLoaded: false,

  loadSections: async () => {
    try {
      const data = require('../../content/sections.json');
      set({ sections: data.sections, isLoaded: true });
    } catch (e) {
      console.error('Failed to load sections', e);
    }
  },

  loadLessonsForSection: async (sectionId: string) => {
    try {
      let data: { lessons: Lesson[] };
      switch (sectionId) {
        case 'basics':
          data = require('../../content/basics.json');
          break;
        case 'control':
          data = require('../../content/control.json');
          break;
        case 'collections':
          data = require('../../content/collections.json');
          break;
        default:
          return;
      }

      const newLessons: Record<string, Lesson[]> = {};
      for (const lesson of data.lessons) {
        if (!newLessons[lesson.topicId]) newLessons[lesson.topicId] = [];
        newLessons[lesson.topicId].push(lesson);
      }

      set(state => ({
        lessons: { ...state.lessons, ...newLessons },
      }));
    } catch (e) {
      console.error('Failed to load lessons for section', sectionId, e);
    }
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
