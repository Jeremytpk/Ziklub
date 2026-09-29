// Contact messages in Firestore: anyone signed in can send; nobody can read or change them from the app.
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { addDoc, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, serverTimestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sendFeedback } from '../src/feedback';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-ziklub', appId: 'demo' }, 'feedback-test');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
let uid = '';

beforeAll(async () => {
  uid = (await signInAnonymously(auth)).user.uid;
});
afterAll(() => deleteApp(app));

const base = () => ({ topic: 'feedback', message: 'Super app', lang: 'fr', platform: 'web', uid, status: 'new', createdAt: serverTimestamp() });

describe('contact messages (Firestore rules)', () => {
  it('a visitor can send a message, with or without name and email', async () => {
    await sendFeedback(db, uid, { topic: 'question', message: 'Comment ça marche ?' }, { lang: 'fr', platform: 'web' });
    await sendFeedback(db, uid, { topic: 'problem', message: 'Le son coupe', name: 'Karim', email: 'karim@example.com' }, { lang: 'fr', platform: 'web' });
  });

  it('nobody can read, list or edit messages from the app', async () => {
    const ref = await addDoc(collection(db, 'feedback'), base());
    await expect(getDoc(doc(db, 'feedback', ref.id))).rejects.toThrow(/permission|false for/i);
    await expect(getDocs(collection(db, 'feedback'))).rejects.toThrow(/permission|false for/i);
    await expect(updateDoc(ref, { status: 'done' })).rejects.toThrow(/permission|false for/i);
  });

  it('refuses fake or malformed messages', async () => {
    const bad = [
      { ...base(), uid: 'someone-else' },
      { ...base(), message: '' },
      { ...base(), message: 'x'.repeat(2001) },
      { ...base(), topic: 'spam' },
      { ...base(), email: 'not-an-email' },
      { ...base(), status: 'done' },
      { ...base(), createdAt: new Date(2000, 0, 1) },
      { ...base(), extra: 'field' },
    ];
    for (const data of bad) await expect(addDoc(collection(db, 'feedback'), data)).rejects.toThrow(/permission|false for/i);
  });
});
