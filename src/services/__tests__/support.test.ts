import { Linking } from 'react-native';
import { showNotice } from '../dialog';
import { questionReportUrl, reportQuestion, SUPPORT_EMAIL } from '../support';

jest.mock('../dialog', () => ({ showNotice: jest.fn() }));

const report = { questionId: 'variables-01-q3', lessonId: 'variables-01', answer: 'undefined' };

function parse(url: string) {
  const [address, query] = url.replace(/^mailto:/, '').split('?');
  const params = Object.fromEntries(
    query.split('&').map(p => {
      const [k, v] = p.split('=');
      return [k, decodeURIComponent(v)];
    }),
  );
  return { address, subject: params.subject, body: params.body };
}

describe('questionReportUrl', () => {
  it('writes to the support address with the question details', () => {
    const { address, subject, body } = parse(questionReportUrl(report, '1.1.0'));
    expect(address).toBe(SUPPORT_EMAIL);
    expect(subject).toBe('ошибка в задании variables-01-q3');
    expect(body.split('\r\n')).toEqual([
      'вопрос: variables-01-q3',
      'урок: variables-01',
      'версия приложения: 1.1.0',
      'мой ответ: undefined',
      '',
      'что не так:',
      '',
      '',
    ]);
  });

  it('puts a multi-line answer on its own lines and escapes it', () => {
    const answer = 'const a = 1;\nconsole.log(a & 2);';
    const url = questionReportUrl({ ...report, answer }, '1.1.0');
    expect(url).not.toMatch(/\s/);
    expect(url.split('&')).toHaveLength(2); // the «&» of the answer is escaped
    expect(parse(url).body).toContain('мой ответ:\r\nconst a = 1;\r\nconsole.log(a & 2);\r\n');
  });
});

describe('reportQuestion', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('opens the mail app', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await reportQuestion(report);
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^mailto:jssensei\.app@gmail\.com\?/));
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('shows the address when there is no mail app', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const open = jest.spyOn(Linking, 'openURL');
    await reportQuestion(report);
    expect(open).not.toHaveBeenCalled();
    expect(showNotice).toHaveBeenCalledWith(
      'не удалось открыть почту',
      expect.stringContaining(SUPPORT_EMAIL),
    );
  });

  it('shows the address when opening fails', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('no'));
    await reportQuestion(report);
    expect(showNotice).toHaveBeenCalled();
  });
});
