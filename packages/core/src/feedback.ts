import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';

// Messages sent through the Contact page. Stored in Firestore; only the team can read them (Firebase console).

export const FEEDBACK_TOPICS = ['feedback', 'question', 'problem', 'copyright', 'privacy'] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export const FEEDBACK_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export interface FeedbackInput {
  topic: FeedbackTopic;
  message: string;
  name?: string;
  email?: string;
}

export type FeedbackError = 'message-missing' | 'message-too-long' | 'email-invalid' | 'topic-invalid';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cleans the form and returns what is wrong with it, if anything. The same checks run in firestore.rules. */
export function checkFeedback(input: FeedbackInput): { value: FeedbackInput; error: FeedbackError | null } {
  const value: FeedbackInput = {
    topic: input.topic,
    message: input.message.trim(),
    name: input.name?.trim().slice(0, FEEDBACK_LIMITS.name) || undefined,
    email: input.email?.trim().slice(0, FEEDBACK_LIMITS.email) || undefined,
  };
  let error: FeedbackError | null = null;
  if (!(FEEDBACK_TOPICS as readonly string[]).includes(value.topic)) error = 'topic-invalid';
  else if (!value.message) error = 'message-missing';
  else if (value.message.length > FEEDBACK_LIMITS.message) error = 'message-too-long';
  else if (value.email && !EMAIL.test(value.email)) error = 'email-invalid';
  return { value, error };
}

/** Saves a contact message. Throws if the form is invalid or the write is refused. */
export async function sendFeedback(db: Firestore, uid: string, input: FeedbackInput, context: { lang: string; platform: string }): Promise<void> {
  const { value, error } = checkFeedback(input);
  if (error) throw new Error(error);
  await addDoc(collection(db, 'feedback'), {
    topic: value.topic,
    message: value.message,
    ...(value.name ? { name: value.name } : {}),
    ...(value.email ? { email: value.email } : {}),
    lang: context.lang.slice(0, 5),
    platform: context.platform.slice(0, 20),
    uid,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}
