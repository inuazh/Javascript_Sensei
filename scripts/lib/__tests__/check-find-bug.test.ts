import type { FindBugQuestion } from '../../../src/content/schema';
import { checkFindBugFix, checkFindBugLines } from '../check-find-bug';

const CODE = 'const a = 1;\nconst b = "2";\n\nconsole.log(a + b);';

const q = (extra: Partial<FindBugQuestion> = {}): FindBugQuestion => ({
  id: 'demo-01-q6',
  type: 'findBug',
  code: CODE,
  bugLine: 2,
  explanation: 'b is a string',
  ...extra,
});

describe('checkFindBugLines', () => {
  it('accepts a bug line inside the code', () => {
    expect(checkFindBugLines(q())).toEqual({ errors: [], warnings: [] });
  });

  it('rejects a bug line out of range or on a blank line', () => {
    expect(checkFindBugLines(q({ bugLine: 5 })).errors).toEqual([
      '"bugLine" 5 is out of range: the code has 4 lines',
    ]);
    expect(checkFindBugLines(q({ bugLine: 3 })).errors).toEqual([
      '"bugLine" 3 points at a blank line',
    ]);
  });

  it('rejects a fix that changes nothing and warns about long or short code', () => {
    expect(checkFindBugLines(q({ fixed: CODE })).errors).toEqual(['"fixed" is the same as "code"']);
    expect(checkFindBugLines(q({ code: 'a;\nb;', bugLine: 1 })).warnings).toHaveLength(1);
    expect(
      checkFindBugLines(q({ code: Array(11).fill('x;').join('\n'), bugLine: 1 })).warnings,
    ).toHaveLength(1);
  });
});

describe('checkFindBugFix', () => {
  it('passes when the fix changes the output', async () => {
    const fixed = 'const a = 1;\nconst b = 2;\n\nconsole.log(a + b);';
    expect(await checkFindBugFix(q({ fixed }))).toEqual([]);
  });

  it('warns when the fix prints the same', async () => {
    const fixed = "const a = 1;\nconst b = '2';\n\nconsole.log(a + b);";
    const warnings = await checkFindBugFix(q({ fixed }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('print the same [12]');
  });

  it('skips questions without a fix', async () => {
    expect(await checkFindBugFix(q())).toEqual([]);
  });
});
