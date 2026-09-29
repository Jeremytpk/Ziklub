import { describe, expect, it } from 'vitest';
import { buildFeedbackEmail, sendWithResend } from '../src/notify';

describe('contact message emails', () => {
  const when = new Date('2026-09-29T05:20:00Z');

  it('builds a readable plain-text email with a reply-to', () => {
    const e = buildFeedbackEmail(
      { topic: 'problem', message: 'Le son coupe\nsur iPhone', name: 'Karim', email: 'karim@example.com', lang: 'fr', platform: 'web', createdAt: when },
      'abc123',
      'ziklub',
    );
    expect(e.subject).toBe('[Ziklub] Something isn’t working: Le son coupe sur iPhone');
    expect(e.replyTo).toBe('karim@example.com');
    expect(e.text).toContain('Le son coupe\nsur iPhone');
    expect(e.text).toContain('From: Karim <karim@example.com>');
    expect(e.text).toContain('2026-09-29 05:20 UTC');
    expect(e.text).toContain('/project/ziklub/firestore/databases/-default-/data/~2Ffeedback~2Fabc123');
  });

  it('handles anonymous messages and keeps user text out of the headers', () => {
    const e = buildFeedbackEmail({ topic: 'feedback', message: 'Hi\r\nBcc: evil@example.com', email: 'bad\nemail' }, 'x', 'ziklub');
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.replyTo).toBeUndefined();
    expect(e.text).toContain('From: <bad email>');
    const anon = buildFeedbackEmail({ topic: 'question', message: 'Hello' }, 'y', 'ziklub');
    expect(anon.text).toContain('From: Anonymous');
    expect(anon.text).toContain('they cannot be answered');
  });

  it('sends through Resend and reports refusals', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{"id":"1"}', { status: 200 });
    }) as unknown as typeof fetch;
    await sendWithResend('key123', 'team@example.com', { subject: 'S', text: 'T', replyTo: 'a@b.co' }, ok);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer key123');
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ to: ['team@example.com'], subject: 'S', text: 'T', reply_to: 'a@b.co' });
    const refused = (async () => new Response('bad key', { status: 401 })) as unknown as typeof fetch;
    await expect(sendWithResend('x', 'y@z.co', { subject: 'S', text: 'T' }, refused)).rejects.toThrow('401');
  });
});
