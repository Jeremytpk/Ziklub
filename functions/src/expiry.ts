// Room lifetime rules. Keep these values in sync with packages/core/src/room.ts (a test checks it).

/** Every room is erased 3 hours after it was created. */
export const ROOM_MAX_AGE_MS = 3 * 60 * 60 * 1000;
/** A room nobody is in is erased after 15 minutes, even if music was playing. */
export const EMPTY_ROOM_TIMEOUT_MS = 15 * 60 * 1000;

export interface MetaLike {
  createdAt?: number;
  closedBy?: string;
  emptySince?: number;
}

export type Decision = 'erase' | 'mark-empty' | 'clear-empty' | 'keep';

/** What the clean-up should do with one room. */
export function decide(meta: MetaLike | null, memberCount: number, now: number): Decision {
  if (!meta || typeof meta.createdAt !== 'number') return 'erase'; // leftovers of a half-erased room
  if (meta.closedBy) return 'erase'; // closed by the DJ; erase in case their phone didn't finish
  if (now >= meta.createdAt + ROOM_MAX_AGE_MS) return 'erase';
  if (memberCount === 0) {
    if (typeof meta.emptySince !== 'number') return 'mark-empty';
    return now - meta.emptySince >= EMPTY_ROOM_TIMEOUT_MS ? 'erase' : 'keep';
  }
  return typeof meta.emptySince === 'number' ? 'clear-empty' : 'keep';
}
