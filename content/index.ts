import type { SectionDef, SectionFile } from '../src/content/schema';

/**
 * Registry of lesson files, one entry per section in sections.json.
 *
 * To add a section:
 *   1. create content/<sectionId>.json
 *   2. add the section and its topics to content/sections.json
 *   3. add one line below
 *   4. run `npm run validate:content`
 *
 * Metro only bundles `require` calls with a literal path, so each file
 * has to be listed here explicitly.
 */
export const SECTION_FILES: Record<string, () => SectionFile> = {
  basics: () => require('./basics.json'),
  control: () => require('./control.json'),
  collections: () => require('./collections.json'),
  interview: () => require('./interview.json'),
};

export function loadSectionDefs(): SectionDef[] {
  const data: { sections: SectionDef[] } = require('./sections.json');
  return [...data.sections].sort((a, b) => a.order - b.order);
}
