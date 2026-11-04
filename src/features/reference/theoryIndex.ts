import { getSections, getTopicLessons } from '../../content/repository';
import { buildTheoryIndex, type TheoryIndex } from './search';

let cached: TheoryIndex | null = null;

/** Search index of the bundled content, built on first use. */
export function getTheoryIndex(): TheoryIndex {
  cached ??= buildTheoryIndex(getSections(), getTopicLessons);
  return cached;
}
