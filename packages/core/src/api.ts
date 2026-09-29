import {
  type Database,
  child,
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
import { type FirebaseStorage, deleteObject, getDownloadURL, ref as sref, uploadBytesResumable } from 'firebase/storage';
import { generateRoomCode, sortQueue } from './room';
import type { Member, Message, Playback, Reaction, RoomMeta, RoomState, SystemEvent, Track } from './types';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type Unsubscribe = () => void;

/**
 * All reads and writes for a room. Platform-neutral: pass in the Firebase instances created by the app
 * (the web and the Expo app configure auth persistence differently).
 */
export function createZiklubApi(db: Database, storage: FirebaseStorage) {
  const roomRef = (code: string, path = '') => ref(db, `rooms/${code}${path ? '/' + path : ''}`);

  return {
    /** Server clock offset in ms (serverNow = Date.now() + offset). */
    subscribeServerOffset(cb: (offset: number) => void): Unsubscribe {
      return onValue(ref(db, '.info/serverTimeOffset'), (s) => cb(Number(s.val()) || 0));
    },

    async roomExists(code: string): Promise<boolean> {
      return (await get(roomRef(code, 'meta'))).exists();
    },

    /** Creates a room with a fresh code. The creator is the first DJ. */
    async createRoom(uid: string): Promise<string> {
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = generateRoomCode();
        const res = await runTransaction(roomRef(code, 'meta'), (cur) => {
          if (cur !== null) return; // taken, abort
          return { createdAt: Date.now(), createdBy: uid, djUid: uid } satisfies RoomMeta;
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

    /** DJ only. Uploads an audio file and adds it to the queue. */
    async addTrack(
      code: string,
      uid: string,
      file: Blob,
      info: { title: string; duration: number; contentType: string },
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
      const track = { title: info.title.slice(0, 200), duration: info.duration, url, path, addedBy: uid, addedAt: Date.now() };
      await set(roomRef(code, `queue/${id}`), track);
      return { ...track, id };
    },

    /** DJ only. */
    async removeTrack(code: string, track: Track): Promise<void> {
      await remove(roomRef(code, `queue/${track.id}`));
      await deleteObject(sref(storage, track.path)).catch(() => undefined);
    },
  };
}

export type ZiklubApi = ReturnType<typeof createZiklubApi>;
