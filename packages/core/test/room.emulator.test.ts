// Runs against the Firebase emulators: `npm run emulators` in one terminal, then `npm run test:emulators`.
// Two friends (A = DJ, B = listener) exercise the API and the security rules.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, goOffline, ref, set } from 'firebase/database';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createZiklubApi, type RoomState, type SongRequest, type ZiklubApi } from '../src';

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
let C: Client;
let code: string;

beforeAll(async () => {
  A = await client('A');
  B = await client('B');
  C = await client('C');
});

afterAll(async () => {
  for (const c of [A, B, C]) {
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
    const track = await A.api.addTrack(code, A.uid, song, { title: 'Nuit blanche', duration: 180, contentType: 'audio/mpeg', addedByName: 'Maya', asRequest: false });
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

  it('the DJ can hand the aux back', async () => {
    await B.api.passAux(code, A.uid);
    const s = await nextState(B, code, (x) => x.meta?.djUid === A.uid);
    expect(s.meta?.djUid).toBe(A.uid);
  });

  describe('song suggestions', () => {
    const song = () => new Blob([new Uint8Array(1024)], { type: 'audio/mpeg' });
    const firstList = (sub: (cb: (r: SongRequest[]) => void) => () => void, until: (r: SongRequest[]) => boolean) =>
      new Promise<SongRequest[]>((resolve) => {
        const off = sub((r) => {
          if (until(r)) {
            setTimeout(off, 0);
            resolve(r);
          }
        });
      });
    let req: SongRequest;

    it('a member suggests a song: private to them and the DJ', async () => {
      await C.api.joinRoom(code, C.uid, { name: 'Léa', look: { body: 'pink' } });
      const t = await B.api.addTrack(code, B.uid, song(), { title: 'Idée de Karim', duration: 120, contentType: 'audio/mpeg', addedByName: 'Karim', asRequest: true });
      // The DJ sees it
      const forDj = await firstList((cb) => A.api.subscribeRequests(code, cb), (r) => r.length === 1);
      req = forDj[0];
      expect(req.id).toBe(t.id);
      expect(req.addedByName).toBe('Karim');
      // The suggester sees their own
      const mine = await firstList((cb) => B.api.subscribeMyRequests(code, B.uid, cb), (r) => r.length === 1);
      expect(mine[0].title).toBe('Idée de Karim');
      // Another member sees nothing: not the list, not the item, not via their own query
      await expect(get(ref(C.db, `rooms/${code}/requests`))).rejects.toThrow();
      await expect(get(ref(C.db, `rooms/${code}/requests/${req.id}`))).rejects.toThrow();
      expect(await firstList((cb) => C.api.subscribeMyRequests(code, C.uid, cb), () => true)).toEqual([]);
      // It is not in the queue yet
      const s = await nextState(C, code, () => true);
      expect(s.queue.some((q) => q.id === req.id)).toBe(false);
    });

    it('members cannot approve, fake or delete other people\'s suggestions', async () => {
      await expect(C.api.approveRequest(code, C.uid, 'Léa', req)).rejects.toThrow();
      await expect(C.api.removeRequest(code, req)).rejects.toThrow();
      const { id: _id, ...data } = req;
      await expect(set(ref(C.db, `rooms/${code}/requests/fake`), { ...data, addedBy: B.uid })).rejects.toThrow(/permission/i);
    });

    it('the DJ approves: it joins the queue, visible to everyone', async () => {
      await A.api.approveRequest(code, A.uid, 'Maya', req);
      const s = await nextState(C, code, (x) => x.queue.some((q) => q.id === req.id));
      expect(s.queue.find((q) => q.id === req.id)?.addedByName).toBe('Karim');
      expect(await firstList((cb) => A.api.subscribeRequests(code, cb), (r) => r.length === 0)).toEqual([]);
    });

    it('the DJ declines, or the member cancels', async () => {
      await B.api.addTrack(code, B.uid, song(), { title: 'Bof', duration: 60, contentType: 'audio/mpeg', addedByName: 'Karim', asRequest: true });
      await B.api.addTrack(code, B.uid, song(), { title: 'Oups', duration: 60, contentType: 'audio/mpeg', addedByName: 'Karim', asRequest: true });
      const pending = await firstList((cb) => A.api.subscribeRequests(code, cb), (r) => r.length === 2);
      await A.api.removeRequest(code, pending.find((r) => r.title === 'Bof')!);
      await B.api.removeRequest(code, pending.find((r) => r.title === 'Oups')!);
      expect(await firstList((cb) => A.api.subscribeRequests(code, cb), (r) => r.length === 0)).toEqual([]);
    });
  });

  it('only the DJ can reorder the queue and play effects', async () => {
    const song = new Blob([new Uint8Array(512)], { type: 'audio/mpeg' });
    await A.api.addTrack(code, A.uid, song, { title: 'Deux', duration: 60, contentType: 'audio/mpeg', addedByName: 'Maya', asRequest: false });
    const before = await nextState(A, code, (x) => x.queue.length >= 2);
    const last = before.queue[before.queue.length - 1];
    await expect(B.api.moveTrack(code, before.queue, last.id, -1)).rejects.toThrow();
    await A.api.moveTrack(code, before.queue, last.id, -1);
    const after = await nextState(B, code, (x) => x.queue[x.queue.length - 2]?.id === last.id);
    expect(after.queue[after.queue.length - 2].id).toBe(last.id);

    await A.api.sendEffect(code, A.uid, 'airhorn');
    await expect(B.api.sendEffect(code, B.uid, 'airhorn')).rejects.toThrow();
    const got = await new Promise<string>((resolve) => {
      const off = B.api.subscribeEffects(code, 0, (e) => {
        setTimeout(off, 0);
        resolve(e.fx);
      });
    });
    expect(got).toBe('airhorn');
  });

  it('when the DJ leaves, the remaining member can claim the aux', async () => {
    await A.api.leaveRoom(code, A.uid);
    const ok = await B.api.claimAux(code, B.uid, A.uid);
    expect(ok).toBe(true);
    const s = await nextState(B, code, (x) => x.meta?.djUid === B.uid);
    expect(s.meta?.djUid).toBe(B.uid);
  });
});
