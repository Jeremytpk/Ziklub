import { initializeApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { GoogleAuth } from 'google-auth-library';
import { buildFeedbackEmail, sendWithResend, type FeedbackDoc } from './notify';
import { listRoomCodes, sweepRooms } from './sweep';

/** Resend API key (Firebase secret): firebase functions:secrets:set RESEND_API_KEY */
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
/** Where contact messages are emailed. Set in functions/.env.<project> (kept out of git). */
const NOTIFY_EMAIL = defineString('NOTIFY_EMAIL');

const app = initializeApp();

/**
 * Every 5 minutes: erase rooms older than 3 hours, rooms closed by their DJ,
 * and rooms nobody has been in for 15 minutes (database data and uploaded songs).
 */
export const cleanUpRooms = onSchedule({ schedule: 'every 5 minutes', region: 'us-central1', timeoutSeconds: 300, memory: '256MiB' }, async () => {
  const db = getDatabase(app);
  const bucket = getStorage(app).bucket();
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase.database', 'https://www.googleapis.com/auth/userinfo.email'] });
  const token = await auth.getAccessToken();
  const databaseUrl = app.options.databaseURL ?? `https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`;
  const result = await sweepRooms(db, bucket, () => listRoomCodes(databaseUrl, token ?? ''), Date.now());
  logger.info('Room clean-up', result);
});

/** Emails the team each time someone sends a message through the Contact page. */
export const emailNewFeedback = onDocumentCreated(
  { document: 'feedback/{id}', region: 'us-central1', secrets: [RESEND_API_KEY], retry: false },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const email = buildFeedbackEmail(snap.data() as FeedbackDoc, event.params.id, process.env.GCLOUD_PROJECT ?? 'ziklub');
    try {
      await sendWithResend(RESEND_API_KEY.value(), NOTIFY_EMAIL.value(), email);
      await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
    } catch (e) {
      logger.error('Could not email new feedback', { id: event.params.id, error: String(e) });
    }
  },
);
