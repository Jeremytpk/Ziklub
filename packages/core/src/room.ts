import type { Member, Playback, Track } from './types';

// No 0/O, 1/I/L: codes are read aloud and typed on phones.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return s;
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((ch) => ALPHABET.includes(ch));
}

/** Where the song should be right now (seconds), according to the shared playback state. */
export function expectedPosition(p: Playback, serverNow: number): number {
  if (!p.playing) return p.position;
  return p.position + Math.max(0, (serverNow - p.updatedAt) / 1000);
}

export const queueOrder = (t: Track) => t.order ?? t.addedAt;

export function sortQueue(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => queueOrder(a) - queueOrder(b) || a.id.localeCompare(b.id));
}

/**
 * New `order` values to move a track one place up (-1) or down (+1): it swaps places with its neighbour.
 * Returns null when it is already at that end.
 */
export function moveInQueue(queue: Track[], id: string, dir: -1 | 1): Record<string, number> | null {
  const i = queue.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= queue.length) return null;
  const a = queue[i];
  const b = queue[j];
  let oa = queueOrder(b);
  let ob = queueOrder(a);
  if (oa === ob) {
    // Same position value (rare): nudge so the swap is visible.
    oa += dir * 0.5;
    ob -= dir * 0.5;
  }
  return { [a.id]: oa, [b.id]: ob };
}

export function nextTrack(queue: Track[], currentId: string | null): Track | null {
  if (!queue.length) return null;
  const i = queue.findIndex((t) => t.id === currentId);
  return i === -1 ? queue[0] : queue[i + 1] ?? null;
}

export function previousTrack(queue: Track[], currentId: string | null): Track | null {
  const i = queue.findIndex((t) => t.id === currentId);
  return i > 0 ? queue[i - 1] : null;
}

/**
 * If the DJ has left, the member who has been in the room the longest takes the aux.
 * Returns the uid that should claim it, or null if nothing needs to change.
 */
export function auxSuccessor(djUid: string | undefined, members: Member[]): string | null {
  if (!members.length) return null;
  if (djUid && members.some((m) => m.uid === djUid)) return null;
  const sorted = [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.uid.localeCompare(b.uid));
  return sorted[0].uid;
}
