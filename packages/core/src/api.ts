import {
  type Database,
  child,
  equalTo,
  get,
  limitToLast,
  onChildAdded,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  startAt,
  update,
} from 'firebase/database';
import { type FirebaseStorage, deleteObject, getDownloadURL, listAll, ref as sref, uploadBytesResumable } from 'firebase/storage';
import { generateRoomCode, moveInQueue, roomStatus, sortQueue } from './room';
import type { EffectEvent, Member, Message, Playback, Reaction, RoomMeta, RoomState, SongRequest, SystemEvent, Track } from './types';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type Unsubscribe = () => void;

/**
 * All reads and writes for a room. Platform-neutral: pass in the Firebase instances created by the app
 * (the web and the Expo app configure auth persistence differently).
 */
export function createZiklubApi(db: Database, storage: FirebaseStorage) {
  const roomRef = (code: string, path = '') => ref(db, `rooms/${code}${path ? '/' + path : ''}`);

  // Server clock, so room ages are measured the same way on every device.
  let offset = 0;
  onValue(ref(db, '.info/serverTimeOffset'), (s) => (offset = Number(s.val()) || 0));
  const serverNow = () => Date.now() + offset;

  /** Deletes every song file of the room, then the room itself. */
  const eraseRoom = async (code: string) => {
    const files = await listAll(sref(storage, `rooms/${code}`)).catch(() => null);
    await Promise.all((files?.items ?? []).map((f) => deleteObject(f).catch(() => undefined)));
    await remove(roomRef(code));
  };

  return {
    /** Server clock offset in ms (serverNow = Date.now() + offset). */
    subscribeServerOffset(cb: (offset: number) => void): Unsubscribe {
      return onValue(ref(db, '.info/serverTimeOffset'), (s) => cb(Number(s.val()) || 0));
    },

    /** True if the room exists and has not been closed or reached its time limit. */
    async roomExists(code: string): Promise<boolean> {
      const meta = (await get(roomRef(code, 'meta'))).val() as RoomMeta | null;
      return roomStatus(meta, serverNow()) === 'open';
    },

    /** Creates a room with a fresh code. The creator is the first DJ. */
    async createRoom(uid: string): Promise<string> {
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = generateRoomCode();
        const res = await runTransaction(roomRef(code, 'meta'), (cur) => {
          if (cur !== null) return; // taken, abort
          return { createdAt: serverNow(), createdBy: uid, djUid: uid } satisfies RoomMeta;
        });
        if (res.committed) return code;
      }
      throw new Error('Could not create a room, please try again.');
    },

    /** Adds the user to the room. They are removed automatically when they disconnect. */
    async joinRoom(code: string, uid: string, profile: { name: string; look: Record<string, string> }): Promise<void> {
      const me = roomRef(code, `members/${uid}`);
      await onDisconnect(me).remove();
      await set(me, { name: profile.name, look: profile.look, joinedAt: serverTimestamp() });
    },

    /**
     * DJ or creator: closes the room for everyone. Members are told who closed it, then all its data
     * and songs are erased.
     */
    async closeRoom(code: string, byName: string): Promise<void> {
      await set(roomRef(code, 'meta/closedBy'), byName.slice(0, 20) || '…');
      // Give everyone a moment to receive the notice before the data disappears.
      await new Promise((r) => setTimeout(r, 1500));
      await eraseRoom(code);
    },

    /** DJ or creator: deletes every song file of the room, then the room itself. */
    eraseRoom,

    async leaveRoom(code: string, uid: string): Promise<void> {
      const me = roomRef(code, `members/${uid}`);
      await onDisconnect(me).cancel();
      await remove(me);
    },

    async updateProfile(code: string, uid: string, profile: { name: string; look: Record<string, string> }): Promise<void> {
      await update(roomRef(code, `members/${uid}`), { name: profile.name, look: profile.look });
    },

    /** Meta, members, queue and playback, combined. */
    subscribeRoom(code: string, cb: (s: RoomState) => void): Unsubscribe {
      const state: RoomState = { meta: null, members: [], queue: [], playback: null };
      const loaded = { meta: false, members: false, queue: false, playback: false };
      const emit = () => {
        if (Object.values(loaded).every(Boolean)) cb({ ...state });
      };
      const unsubs = [
        onValue(roomRef(code, 'meta'), (s) => {
          state.meta = s.val();
          loaded.meta = true;
          emit();
        }),
        onValue(roomRef(code, 'members'), (s) => {
          const v = (s.val() ?? {}) as Record<string, Omit<Member, 'uid'>>;
          state.members = Object.entries(v).map(([uid, m]) => ({ ...m, uid }));
          loaded.members = true;
          emit();
        }),
        onValue(roomRef(code, 'queue'), (s) => {
          const v = (s.val() ?? {}) as Record<string, Omit<Track, 'id'>>;
          state.queue = sortQueue(Object.entries(v).map(([id, t]) => ({ ...t, id })));
          loaded.queue = true;
          emit();
        }),
        onValue(roomRef(code, 'playback'), (s) => {
          const v = s.val();
          state.playback = v ? { trackId: v.trackId ?? null, playing: !!v.playing, position: v.position ?? 0, updatedAt: v.updatedAt ?? 0 } : null;
          loaded.playback = true;
          emit();
        }),
      ];
      return () => unsubs.forEach((u) => u());
    },

    subscribeMessages(code: string, cb: (m: Message[]) => void, limit = 80): Unsubscribe {
      return onValue(query(roomRef(code, 'messages'), limitToLast(limit)), (s) => {
        const out: Message[] = [];
        s.forEach((c) => {
          out.push({ ...c.val(), id: c.key! });
        });
        cb(out);
      });
    },

    async sendMessage(code: string, uid: string, name: string, text: string): Promise<void> {
      const clean = text.trim().slice(0, 500);
      if (!clean) return;
      await push(roomRef(code, 'messages'), { kind: 'user', uid, name, text: clean, ts: serverTimestamp() });
    },

    async sendSystem(code: string, uid: string, event: SystemEvent, params: Record<string, string>): Promise<void> {
      await push(roomRef(code, 'messages'), { kind: 'system', uid, event, params, ts: serverTimestamp() });
    },

    async sendReaction(code: string, uid: string, mood: string): Promise<void> {
      await push(roomRef(code, 'reactions'), { uid, mood, ts: serverTimestamp() });
    },

    /** Reactions sent after `sinceServerMs`, one callback per reaction. */
    subscribeReactions(code: string, sinceServerMs: number, cb: (r: Reaction) => void): Unsubscribe {
      const q = query(roomRef(code, 'reactions'), orderByChild('ts'), startAt(sinceServerMs));
      return onChildAdded(q, (s) => cb({ ...s.val(), id: s.key! }));
    },

    /** DJ only: plays a sound effect for everyone. */
    async sendEffect(code: string, uid: string, fx: string): Promise<void> {
      await push(roomRef(code, 'effects'), { uid, fx, ts: serverTimestamp() });
    },

    /** Effects sent after `sinceServerMs`, one callback per effect. */
    subscribeEffects(code: string, sinceServerMs: number, cb: (e: EffectEvent) => void): Unsubscribe {
      const q = query(roomRef(code, 'effects'), orderByChild('ts'), startAt(sinceServerMs));
      return onChildAdded(q, (s) => cb({ ...s.val(), id: s.key! }));
    },

    /** DJ only. Writes the shared playback state. */
    async setPlayback(code: string, p: Omit<Playback, 'updatedAt'>): Promise<void> {
      await set(roomRef(code, 'playback'), { ...p, updatedAt: serverTimestamp() });
    },

    /** DJ only. Gives the aux to another member. */
    async passAux(code: string, toUid: string): Promise<void> {
      await set(roomRef(code, 'meta/djUid'), toUid);
    },

    /** Takes the aux if the current DJ has left. Returns true if it worked. */
    async claimAux(code: string, uid: string, expectedDj: string | undefined): Promise<boolean> {
      try {
        const res = await runTransaction(roomRef(code, 'meta/djUid'), (cur) => {
          // null = not loaded yet on this device: return it unchanged so the server replies with the real value.
          if (cur === null) return null;
          return cur === expectedDj ? uid : undefined;
        });
        return res.committed && res.snapshot.val() === uid;
      } catch {
        return false;
      }
    },

    /**
     * Uploads an audio file. The DJ's songs go straight into the queue; anyone else's become a
     * suggestion (request) that only the DJ and they can see, until the DJ approves it.
     */
    async addTrack(
      code: string,
      uid: string,
      file: Blob,
      info: { title: string; duration: number; contentType: string; addedByName: string; asRequest: boolean },
      onProgress?: (fraction: number) => void,
    ): Promise<Track> {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error('too-big');
      const id = push(child(roomRef(code), 'queue')).key!;
      const path = `rooms/${code}/${id}`;
      const task = uploadBytesResumable(sref(storage, path), file, { contentType: info.contentType });
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', (s) => onProgress?.(s.bytesTransferred / Math.max(1, s.totalBytes)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      const track = {
        title: info.title.slice(0, 200),
        duration: info.duration,
        url,
        path,
        addedBy: uid,
        addedByName: info.addedByName.slice(0, 20),
        addedAt: Date.now(),
      };
      try {
        await set(roomRef(code, `${info.asRequest ? 'requests' : 'queue'}/${id}`), track);
      } catch (e) {
        await deleteObject(sref(storage, path)).catch(() => undefined);
        throw e;
      }
      return { ...track, id };
    },

    /** DJ only: every pending suggestion in the room. */
    subscribeRequests(code: string, cb: (r: SongRequest[]) => void): Unsubscribe {
      return onValue(
        roomRef(code, 'requests'),
        (s) => cb(toList<SongRequest>(s.val())),
        () => cb([]), // no longer DJ: access is refused
      );
    },

    /** A member's own pending suggestions. */
    subscribeMyRequests(code: string, uid: string, cb: (r: SongRequest[]) => void): Unsubscribe {
      return onValue(
        query(roomRef(code, 'requests'), orderByChild('addedBy'), equalTo(uid)),
        (s) => cb(toList<SongRequest>(s.val())),
        () => cb([]),
      );
    },

    /** DJ only: moves a suggestion into the queue (in one atomic write) and tells the room. */
    async approveRequest(code: string, djUid: string, djName: string, r: SongRequest): Promise<Track> {
      const { id, ...data } = r;
      const track = { ...data, addedAt: Date.now() };
      await update(roomRef(code), { [`queue/${id}`]: track, [`requests/${id}`]: null });
      await push(roomRef(code, 'messages'), {
        kind: 'system',
        uid: djUid,
        event: 'approved',
        params: { dj: djName, name: r.addedByName, title: r.title },
        ts: serverTimestamp(),
      });
      return { ...track, id };
    },

    /** DJ (decline) or the member (cancel): removes a suggestion and its file. */
    async removeRequest(code: string, r: SongRequest): Promise<void> {
      await remove(roomRef(code, `requests/${r.id}`));
      await deleteObject(sref(storage, r.path)).catch(() => undefined);
    },

    /** DJ only: moves a song one place up (-1) or down (+1) in the queue. */
    async moveTrack(code: string, queue: Track[], id: string, dir: -1 | 1): Promise<void> {
      const orders = moveInQueue(queue, id, dir);
      if (!orders) return;
      await update(roomRef(code, 'queue'), Object.fromEntries(Object.entries(orders).map(([tid, o]) => [`${tid}/order`, o])));
    },

    /** DJ only. */
    async removeTrack(code: string, track: Track): Promise<void> {
      await remove(roomRef(code, `queue/${track.id}`));
      await deleteObject(sref(storage, track.path)).catch(() => undefined);
    },
  };
}

function toList<T extends { id: string }>(v: Record<string, Omit<T, 'id'>> | null): T[] {
  return Object.entries(v ?? {})
    .map(([id, x]) => ({ ...x, id }) as T)
    .sort((a, b) => (a as unknown as Track).addedAt - (b as unknown as Track).addedAt);
}

export type ZiklubApi = ReturnType<typeof createZiklubApi>;
