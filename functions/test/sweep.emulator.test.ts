// Runs against the Firebase emulators: `npm run emulators`, then `npm run test:emulators`.
process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { afterAll, describe, expect, it } from 'vitest';
import { listRoomCodes, sweepRooms } from '../src/sweep';

const app = initializeApp(
  { projectId: 'demo-ziklub', databaseURL: 'https://demo-ziklub-default-rtdb.firebaseio.com', storageBucket: 'demo-ziklub.appspot.com' },
  'sweep-test',
);
const db = getDatabase(app);
const bucket = getStorage(app).bucket();
const H = 3600_000;
const M = 60_000;

afterAll(() => deleteApp(app));

describe('automatic room clean-up', () => {
  it('erases old, closed and long-empty rooms with their songs; keeps busy and new ones', async () => {
    const now = Date.now();
    const m = { a: { name: 'A', look: { body: 'mint' }, joinedAt: now } };
    await db.ref('rooms').update({
      SWOLD: { meta: { createdAt: now - 3 * H - M, createdBy: 'a', djUid: 'a' }, members: m, messages: { x: { kind: 'user', uid: 'a', text: 'hi', ts: now } } },
      SWCLS: { meta: { createdAt: now - M, createdBy: 'a', djUid: 'a', closedBy: 'Maya' } },
      SWNEW: { meta: { createdAt: now - M, createdBy: 'a', djUid: 'a' } },
      SWSTL: { meta: { createdAt: now - H, createdBy: 'a', djUid: 'a', emptySince: now - 16 * M }, playback: { playing: true, position: 3, updatedAt: now } },
      SWBSY: { meta: { createdAt: now - H, createdBy: 'a', djUid: 'a', emptySince: now - 5 * M }, members: m },
    });
    await bucket.file('rooms/SWOLD/song1').save(Buffer.from('x'), { contentType: 'audio/mpeg' });
    await bucket.file('rooms/SWBSY/song2').save(Buffer.from('y'), { contentType: 'audio/mpeg' });

    const result = await sweepRooms(db, bucket, () => listRoomCodes('http://127.0.0.1:9000', 'owner', '&ns=demo-ziklub-default-rtdb'), now);

    expect(result.erased).toEqual(expect.arrayContaining(['SWOLD', 'SWCLS', 'SWSTL']));
    expect(result.erased).not.toContain('SWBSY');
    expect(result.erased).not.toContain('SWNEW');
    expect(result.markedEmpty).toContain('SWNEW'); // nobody in it yet: the 15-minute timer starts
    for (const code of ['SWOLD', 'SWCLS', 'SWSTL']) expect((await db.ref(`rooms/${code}`).get()).exists()).toBe(false);
    expect((await db.ref('rooms/SWBSY/meta/emptySince').get()).exists()).toBe(false); // someone is back
    expect((await bucket.file('rooms/SWOLD/song1').exists())[0]).toBe(false);
    expect((await bucket.file('rooms/SWBSY/song2').exists())[0]).toBe(true);

    await db.ref('rooms/SWNEW').remove();
    await db.ref('rooms/SWBSY').remove();
    await bucket.deleteFiles({ prefix: 'rooms/SWBSY/' });
  });
});
