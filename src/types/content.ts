/**
 * Shape of the learning content in /content.
 * See content/README.md for the authoring guide.
 */

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

export interface SectionFile {
  lessons: Lesson[];
}
