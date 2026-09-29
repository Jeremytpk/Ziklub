// Emails the team when someone sends a message through the Contact page.

export interface FeedbackDoc {
  topic?: string;
  message?: string;
  name?: string;
  email?: string;
  lang?: string;
  platform?: string;
  createdAt?: { toDate(): Date } | Date;
}

const TOPIC_LABEL: Record<string, string> = {
  feedback: 'Feedback or idea',
  question: 'Question',
  problem: 'Something isn’t working',
  copyright: 'Copyright request',
  privacy: 'Privacy request',
};

/** Single line, no control characters (keeps user text out of email headers). */
const oneLine = (s: string, max: number) => s.replace(/[\r\n\t\u0000-\u001f]+/g, ' ').trim().slice(0, max);

export interface Email {
  subject: string;
  text: string;
  replyTo?: string;
}

/** Builds the notification email. Plain text only, so nothing the visitor wrote is ever rendered as HTML. */
export function buildFeedbackEmail(doc: FeedbackDoc, id: string, projectId: string): Email {
  const topic = TOPIC_LABEL[doc.topic ?? ''] ?? 'Message';
  const message = (doc.message ?? '').slice(0, 2000);
  const when = doc.createdAt ? ('toDate' in doc.createdAt ? doc.createdAt.toDate() : doc.createdAt) : new Date();
  const from = [doc.name && oneLine(doc.name, 60), doc.email && `<${oneLine(doc.email, 120)}>`].filter(Boolean).join(' ') || 'Anonymous';
  const text = [
    `New message on Ziklub: ${topic}`,
    '',
    message,
    '',
    '—',
    `From: ${from}`,
    `Language: ${doc.lang ?? '?'} · ${doc.platform ?? '?'}`,
    `Sent: ${when.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    doc.email ? 'Reply to this email to answer them.' : 'No email given: they cannot be answered.',
    '',
    `Open in Firebase: https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2Ffeedback~2F${id}`,
  ].join('\n');
  const email = doc.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.email) ? oneLine(doc.email, 120) : undefined;
  return { subject: oneLine(`[Ziklub] ${topic}: ${message}`, 90), text, replyTo: email };
}

/** Sends through Resend (https://resend.com). `fetchImpl` is replaceable for tests. */
export async function sendWithResend(apiKey: string, to: string, email: Email, fetchImpl: typeof fetch = fetch): Promise<void> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Ziklub <onboarding@resend.dev>',
      to: [to],
      subject: email.subject,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend refused the email: ${res.status} ${await res.text()}`);
}
