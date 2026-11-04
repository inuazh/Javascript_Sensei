/**
 * Display order of answer options. Options are shuffled every time a question
 * is shown, so the position of the right answer gives nothing away (in the
 * content it is often the second option) and replays cannot be memorised by
 * position. The answer is still stored as the original option index.
 */

const KEEP_ORDER = [['true', 'false']];

export function optionOrder(options: string[], random: () => number = Math.random): number[] {
  const indices = options.map((_, i) => i);
  const keep = KEEP_ORDER.some(
    fixed => fixed.length === options.length && fixed.every((o, i) => options[i] === o),
  );
  if (keep) return indices;
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
