import type { Database } from 'firebase-admin/database';
import { decide, type MetaLike } from './expiry';

/** The Storage bucket, reduced to what the clean-up needs (easy to fake in tests). */
export interface BucketLike {
  deleteFiles(opts: { prefix: string }): Promise<unknown>;
}

export interface SweepResult {
  erased: string[];
  markedEmpty: string[];
  checked: number;
}

/**
 * Erases rooms that are over 3 hours old, closed, or empty for 15 minutes: their database data and song files.
 * `listCodes` returns every room code (a shallow read, so message history is never downloaded).
 */
export async function sweepRooms(db: Database, bucket: BucketLike, listCodes: () => Promise<string[]>, now: number): Promise<SweepResult> {
  const result: SweepResult = { erased: [], markedEmpty: [], checked: 0 };
  for (const code of await listCodes()) {
    result.checked++;
    const room = db.ref(`rooms/${code}`);
    const [metaSnap, membersSnap] = await Promise.all([room.child('meta').get(), room.child('members').get()]);
    const meta = metaSnap.val() as MetaLike | null;
    const memberCount = membersSnap.exists() ? membersSnap.numChildren() : 0;
    switch (decide(meta, memberCount, now)) {
      case 'erase':
        await bucket.deleteFiles({ prefix: `rooms/${code}/` }).catch(() => undefined);
        await room.remove();
        result.erased.push(code);
        break;
      case 'mark-empty':
        await room.child('meta/emptySince').set(now);
        result.markedEmpty.push(code);
        break;
      case 'clear-empty':
        await room.child('meta/emptySince').remove();
        break;
    }
  }
  return result;
}

/** Room codes via the REST API's shallow query (keys only). */
export async function listRoomCodes(databaseUrl: string, accessToken: string, extraQuery = ''): Promise<string[]> {
  const res = await fetch(`${databaseUrl.replace(/\/$/, '')}/rooms.json?shallow=true${extraQuery}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Listing rooms failed: ${res.status}`);
  const body = (await res.json()) as Record<string, true> | null;
  return Object.keys(body ?? {});
}
