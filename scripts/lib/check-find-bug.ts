/** Checks for `findBug` questions, used by scripts/validate-content.ts. */
import type { FindBugQuestion } from '../../src/content/schema';
import { runSnippet, type RunResult } from './run-snippet';

export const FIND_BUG_LINES = { min: 3, max: 10 };

export interface Issues {
  errors: string[];
  warnings: string[];
}

/** Static checks: `bugLine` points at a real, non-blank line of a short snippet. */
export function checkFindBugLines(q: FindBugQuestion): Issues {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = q.code.split('\n');
  if (q.bugLine > lines.length) {
    errors.push(`"bugLine" ${q.bugLine} is out of range: the code has ${lines.length} lines`);
  } else if (!lines[q.bugLine - 1].trim()) {
    errors.push(`"bugLine" ${q.bugLine} points at a blank line`);
  }
  if (lines.length < FIND_BUG_LINES.min || lines.length > FIND_BUG_LINES.max) {
    warnings.push(
      `code has ${lines.length} lines, keep it between ${FIND_BUG_LINES.min} and ${FIND_BUG_LINES.max}`,
    );
  }
  if (q.fixed !== undefined && q.fixed.trim() === q.code.trim()) {
    errors.push('"fixed" is the same as "code"');
  }
  return { errors, warnings };
}

const describeRun = (run: RunResult) =>
  run.lines.join(' | ') + (run.error ? `${run.lines.length ? ' | ' : ''}<${run.error}>` : '');

/**
 * Runs `code` and `fixed`: the bug must change what the program does, so the
 * outputs must differ. Returns warnings; nothing to check without `fixed`.
 */
export async function checkFindBugFix(q: FindBugQuestion): Promise<string[]> {
  if (q.fixed === undefined) return [];
  // One at a time: runSnippet listens to process-wide unhandled rejections.
  const buggy = await runSnippet(q.code);
  const fixed = await runSnippet(q.fixed);
  if (buggy.error === 'Timeout' || fixed.error === 'Timeout') {
    return ['code did not finish within the time limit, cannot verify the fix'];
  }
  const same =
    buggy.error === fixed.error &&
    buggy.lines.length === fixed.lines.length &&
    buggy.lines.every((line, i) => line === fixed.lines[i]);
  if (same) {
    return [
      `"code" and "fixed" print the same [${describeRun(buggy)}]: the bug must change the output`,
    ];
  }
  return [];
}
