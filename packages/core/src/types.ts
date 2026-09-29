// Shapes of the data stored in the Realtime Database under /rooms/{code}.

export interface RoomMeta {
  createdAt: number;
  createdBy: string;
  /** Who holds the aux (controls playlist and playback). */
  djUid: string;
}

export interface Member {
  uid: string;
  name: string;
  /** A Zu look. Validate with sanitizeLook() from @ziklub/zu before drawing. */
  look: Record<string, string>;
  joinedAt: number;
}

export interface Track {
  id: string;
  title: string;
  /** Seconds. */
  duration: number;
  /** Download URL of the audio file. */
  url: string;
  /** Storage path, used to delete the file. */
  path: string;
  addedBy: string;
  addedAt: number;
}

export interface Playback {
  trackId: string | null;
  playing: boolean;
  /** Position in seconds at the moment `updatedAt` was written. */
  position: number;
  /** Server time (ms) of the last change. */
  updatedAt: number;
}

export type SystemEvent = 'aux' | 'claim' | 'join' | 'look';

export type Message =
  | { id: string; kind: 'user'; uid: string; name: string; text: string; ts: number }
  | { id: string; kind: 'system'; uid: string; event: SystemEvent; params: Record<string, string>; ts: number };

export interface Reaction {
  id: string;
  uid: string;
  mood: string;
  ts: number;
}

export interface RoomState {
  meta: RoomMeta | null;
  members: Member[];
  queue: Track[];
  playback: Playback | null;
}
