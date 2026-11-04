/**
 * Schema of the learning content in /content.
 *
 * It is the single source of truth: app types are inferred from it and
 * scripts/validate-content.ts validates every content file against it.
 * Keep this file free of React Native imports so it can run in Node.
 */
import { z } from 'zod';

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be kebab-case: lowercase letters, digits and dashes');
const text = z.string().trim().min(1);

// ─── Sections ───────────────────────────────────────────────────────────────

export const TopicSchema = z.object({
  id,
  title: text,
  subtitle: text,
  order: z.number().int(),
});

export const SectionSchema = z.object({
  id,
  title: text,
  /** Emoji shown next to the section. */
  icon: text,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be #RRGGBB'),
  order: z.number().int(),
  /** Short description shown on the section header. */
  description: text.optional(),
  topics: z.array(TopicSchema).min(1),
});

export const SectionsFileSchema = z.object({
  sections: z.array(SectionSchema).min(1),
});

// ─── Theory ─────────────────────────────────────────────────────────────────

/**
 * A theory card shown before the questions of a lesson.
 * Text supports inline `code` in backticks and **bold**.
 */
export const TheoryBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text }),
  z.object({ type: z.literal('code'), code: text, caption: text.optional() }),
  z.object({ type: z.literal('tip'), text }),
  z.object({ type: z.literal('warning'), text }),
]);

export const TheorySchema = z.object({
  blocks: z.array(TheoryBlockSchema).min(1),
});

// ─── Questions ──────────────────────────────────────────────────────────────

const questionBase = {
  id,
  /** Prompt shown above the question. Defaults to a per-type title. */
  title: text.optional(),
  /** Shown after answering, whether the answer was right or wrong. */
  explanation: text,
};

const choice = {
  options: z.array(z.string()).min(2),
  correct: z.number().int().min(0),
  /**
   * Optional per-option explanation, shown when the user picks that option.
   * Same length as `options`; use null for options without a comment.
   */
  optionExplanations: z.array(z.string().nullable()).optional(),
};

export const OutputQuestionSchema = z.object({
  ...questionBase,
  ...choice,
  type: z.literal('output'),
  code: text,
});

export const TrueFalseQuestionSchema = z.object({
  ...questionBase,
  ...choice,
  type: z.literal('trueFalse'),
  code: z.string().optional(),
  options: z.array(z.string()).length(2),
});

export const FillQuestionSchema = z.object({
  ...questionBase,
  ...choice,
  type: z.literal('fill'),
  codeBefore: z.string(),
  codeAfter: z.string(),
});

export const OrderQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('order'),
  /** Lines in the correct order. */
  lines: z.array(text).min(2),
  /** Order in which the lines are shown: a permutation of line indexes. */
  shuffled: z.array(z.number().int().min(0)),
  /** The lines are steps in words (a trace, a ranking), not code: nothing to run. */
  steps: z.boolean().optional(),
  /** The code calls helpers that are not part of the question: hide «Запустить». */
  noRun: z.boolean().optional(),
});

export const FindBugQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('findBug'),
  /** A short snippet; the user taps the line with the bug. */
  code: text,
  /** 1-based number of the line with the bug. */
  bugLine: z.number().int().min(1),
  /** The corrected code, shown after a wrong answer. */
  fixed: text.optional(),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  OutputQuestionSchema,
  TrueFalseQuestionSchema,
  FillQuestionSchema,
  OrderQuestionSchema,
  FindBugQuestionSchema,
]);

// ─── Lessons ────────────────────────────────────────────────────────────────

export const LessonSchema = z.object({
  id,
  topicId: id,
  title: text,
  order: z.number().int(),
  theory: TheorySchema.optional(),
  questions: z.array(QuestionSchema).min(1),
});

export const SectionFileSchema = z.object({
  lessons: z.array(LessonSchema).min(1),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type Topic = z.infer<typeof TopicSchema>;
export type SectionDef = z.infer<typeof SectionSchema>;
export type TheoryBlock = z.infer<typeof TheoryBlockSchema>;
export type Theory = z.infer<typeof TheorySchema>;
export type OutputQuestion = z.infer<typeof OutputQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestionSchema>;
export type FillQuestion = z.infer<typeof FillQuestionSchema>;
export type OrderQuestion = z.infer<typeof OrderQuestionSchema>;
export type FindBugQuestion = z.infer<typeof FindBugQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = Question['type'];
export type ChoiceQuestion = OutputQuestion | TrueFalseQuestion | FillQuestion;
export type Lesson = z.infer<typeof LessonSchema>;
export type SectionFile = z.infer<typeof SectionFileSchema>;
