// Runs against the Firebase emulators: `npm run emulators` in one terminal, then `npm run test:emulators`.
// Two friends (A = DJ, B = listener) exercise the API and the security rules.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, goOffline, ref, set } from 'firebase/database';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createZiklubApi, type RoomState, type ZiklubApi } from '../src';

const config = {
  apiKey: 'demo-key',
  projectId: 'demo-ziklub',
  databaseURL: 'https://demo-ziklub-default-rtdb.firebaseio.com',
  storageBucket: 'demo-ziklub.appspot.com',
  appId: 'demo',
};

interface Client {
  app: FirebaseApp;
  uid: string;
  api: ZiklubApi;
  db: ReturnType<typeof getDatabase>;
}

async function client(name: string): Promise<Client> {
  const app = initializeApp(config, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  const cred = await signInAnonymously(auth);
  return { app, uid: cred.user.uid, api: createZiklubApi(db, storage), db };
}

function nextState(c: Client, code: string, until: (s: RoomState) => boolean): Promise<RoomState> {
  return new Promise((resolve) => {
    const off = c.api.subscribeRoom(code, (s) => {
      if (until(s)) {
        setTimeout(off, 0);
        resolve(s);
      }
    });
  });
}

let A: Client;
let B: Client;
let code: string;

beforeAll(async () => {
  A = await client('A');
  B = await client('B');
});

afterAll(async () => {
  for (const c of [A, B]) {
    goOffline(c.db);
    await deleteApp(c.app);
  }
});

describe('a room with two friends', () => {
  it('A creates a room and is the DJ', async () => {
    code = await A.api.createRoom(A.uid);
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
    expect(await B.api.roomExists(code)).toBe(true);
    expect(await B.api.roomExists('ZZZZZ')).toBe(false);
  });

  it('both join and see each other', async () => {
    await A.api.joinRoom(code, A.uid, { name: 'Maya', look: { body: 'mint' } });
    await B.api.joinRoom(code, B.uid, { name: 'Karim', look: { body: 'peach' } });
    const s = await nextState(B, code, (x) => x.members.length === 2);
    expect(s.meta?.djUid).toBe(A.uid);
    expect(s.members.map((m) => m.name).sort()).toEqual(['Karim', 'Maya']);
  });

  it('only the DJ can upload and control playback', async () => {
    const song = new Blob([new Uint8Array(2048)], { type: 'audio/mpeg' });
    const track = await A.api.addTrack(code, A.uid, song, { title: 'Nuit blanche', duration: 180, contentType: 'audio/mpeg' });
    expect(track.url).toContain('http');
    await A.api.setPlayback(code, { trackId: track.id, playing: true, position: 0 });
    const s = await nextState(B, code, (x) => !!x.playback?.playing && x.queue.length === 1);
    expect(s.playback?.trackId).toBe(track.id);
    expect(s.playback?.updatedAt).toBeGreaterThan(0);

    await expect(B.api.setPlayback(code, { trackId: track.id, playing: false, position: 0 })).rejects.toThrow();
    await expect(set(ref(B.db, `rooms/${code}/queue/x`), { title: 'hack', duration: 1, url: 'u', path: 'p', addedBy: B.uid, addedAt: 1 })).rejects.toThrow();
  });

  it('members chat and react; others cannot write as someone else', async () => {
    await B.api.sendMessage(code, B.uid, 'Karim', 'monte le son !!');
    await B.api.sendReaction(code, B.uid, 'fire');
    await expect(B.api.sendMessage(code, A.uid, 'Maya', 'fake')).rejects.toThrow();
    const msgs = await new Promise<string[]>((resolve) => {
      const off = A.api.subscribeMessages(code, (m) => {
        const texts = m.filter((x) => x.kind === 'user').map((x) => (x.kind === 'user' ? x.text : ''));
        if (texts.length) {
          setTimeout(off, 0);
          resolve(texts);
        }
      });
    });
    expect(msgs).toContain('monte le son !!');
  });

  it('a listener cannot take the aux while the DJ is here', async () => {
    await expect(B.api.passAux(code, B.uid)).rejects.toThrow();
  });

  it('the DJ passes the aux, then the new DJ controls playback', async () => {
    await A.api.passAux(code, B.uid);
    const s = await nextState(A, code, (x) => x.meta?.djUid === B.uid);
    expect(s.meta?.djUid).toBe(B.uid);
    await B.api.setPlayback(code, { trackId: s.playback!.trackId, playing: false, position: 42 });
    await expect(A.api.setPlayback(code, { trackId: null, playing: true, position: 0 })).rejects.toThrow();
  });

  it('when the DJ leaves, the remaining member can claim the aux', async () => {
    await B.api.leaveRoom(code, B.uid);
    const ok = await A.api.claimAux(code, A.uid, B.uid);
    expect(ok).toBe(true);
    const s = await nextState(A, code, (x) => x.meta?.djUid === A.uid);
    expect(s.meta?.djUid).toBe(A.uid);
  });
});
