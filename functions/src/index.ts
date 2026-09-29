import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { GoogleAuth } from 'google-auth-library';
import { listRoomCodes, sweepRooms } from './sweep';

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
