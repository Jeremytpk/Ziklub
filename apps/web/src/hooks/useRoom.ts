import {
  auxSuccessor,
  expectedPosition,
  nextDj,
  ROOM_END_WARNING_MS,
  roomEndsAt,
  roomStatus,
  type Member,
  nextTrack,
  PlaybackSync,
  previousTrack,
  type Message,
  type RoomState,
  type SongRequest,
  type Track,
} from '@ziklub/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine, isWebKitAudio } from '../lib/audio';
import { api, serverNow } from '../lib/firebase';
import { quiet } from '../lib/quiet';
import type { Profile } from '../lib/profile';

const LEAD_KEY = 'ziklub.seekLead';
const EMPTY: RoomState = { meta: null, members: [], queue: [], playback: null };

/** Why the room is over: closed by someone, reached 3 hours, or erased. */
export type RoomEnd = { reason: 'closed'; by: string; byMe: boolean } | { reason: 'expired' } | { reason: 'gone' };

/** Joins the room and exposes its live state, the synced player and the DJ actions. */
export function useRoom(code: string, uid: string, profile: Profile) {
  const [state, setState] = useState<RoomState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  /** DJ: every pending suggestion. Others: their own pending suggestions. */
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [ended, setEnded] = useState<RoomEnd | null>(null);
  const [endingSoon, setEndingSoon] = useState(false);
  const closingByMe = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const isDj = !!state.meta && state.meta.djUid === uid;
  const isDjRef = useRef(isDj);
  isDjRef.current = isDj;

  useEffect(() => {
    setRequests([]);
    return isDj ? api.subscribeRequests(code, setRequests) : api.subscribeMyRequests(code, uid, setRequests);
  }, [code, uid, isDj]);

  const currentTrack: Track | null = useMemo(
    () => state.queue.find((t) => t.id === state.playback?.trackId) ?? null,
    [state.queue, state.playback?.trackId],
  );

  // ----- Join / leave -----
  const profileRef = useRef(profile);
  profileRef.current = profile;
  useEffect(() => {
    const p = profileRef.current;
    let alive = true;
    api
      .joinRoom(code, uid, { name: p.name, look: { ...p.look } })
      .then(() => {
        if (!alive) return; // left (or remounted) before the join finished
        // Only announce the first arrival in this browser tab, not every refresh.
        const key = `ziklub.joined.${code}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          quiet(api.sendSystem(code, uid, 'join', { name: p.name }));
        }
      })
      .catch(() => undefined);
    const offRoom = api.subscribeRoom(code, (s) => {
      setState(s);
      setReady(true);
    });
    const offMsgs = api.subscribeMessages(code, setMessages);
    return () => {
      alive = false;
      offRoom();
      offMsgs();
      engine.stop();
      void api.leaveRoom(code, uid).catch(() => undefined);
    };
  }, [code, uid]);

  // ----- Keep the local player in sync with the room -----
  const sync = useMemo(
    () =>
      new PlaybackSync(engine, serverNow, {
        allowRate: !isWebKitAudio,
        onBlocked: () => setSoundBlocked(true),
        onTick: import.meta.env.DEV ? (d) => (window as unknown as { __zkDiffs?: number[] }).__zkDiffs?.push(d) : undefined,
      }),
    [],
  );

  // Each device remembers how late it resumes after a jump, so the next session starts smooth.
  useEffect(() => {
    try {
      sync.lead = Number(localStorage.getItem(LEAD_KEY)) || 0;
    } catch {
      // ignore
    }
    const save = () => {
      try {
        localStorage.setItem(LEAD_KEY, String(sync.lead));
      } catch {
        // ignore
      }
    };
    const id = setInterval(save, 15000);
    return () => {
      clearInterval(id);
      save();
    };
  }, [sync]);

  useEffect(() => {
    if (ended) sync.apply(null, null);
    else sync.apply(state.playback, currentTrack);
  }, [sync, state.playback, currentTrack, ended]);

  // ----- Is the room over? (closed by the DJ/creator, 3 hours reached, or erased) -----
  const endedRef = useRef(ended);
  endedRef.current = ended;
  const check = useCallback(() => {
    if (!ready || endedRef.current) return;
    const meta = stateRef.current.meta;
    const status = roomStatus(meta, serverNow());
    if (status === 'closed') setEnded({ reason: 'closed', by: meta!.closedBy!, byMe: closingByMe.current });
    else if (status === 'expired') {
      setEnded({ reason: 'expired' });
      // The DJ's phone erases it right away; the server clean-up does it otherwise.
      if (isDjRef.current) quiet(api.eraseRoom(code));
    } else if (status === 'gone') setEnded({ reason: 'gone' });
    else setEndingSoon(roomEndsAt(meta!) - serverNow() <= ROOM_END_WARNING_MS);
  }, [ready, code]);
  useEffect(() => {
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [check, state.meta]);

  const setPlayback = useCallback(
    (trackId: string | null, playing: boolean, position: number) => {
      if (!isDjRef.current) return;
      quiet(api.setPlayback(code, { trackId, playing, position: Math.max(0, position) }));
    },
    [code],
  );

  const goNext = useCallback(() => {
    const { queue, playback } = stateRef.current;
    const n = nextTrack(queue, playback?.trackId ?? null);
    if (n) setPlayback(n.id, true, 0);
    else if (playback?.trackId) setPlayback(playback.trackId, false, 0);
  }, [setPlayback]);

  // Drift correction for everyone; the DJ also moves on when a song is over.
  const advancedFrom = useRef<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      sync.tick();
      const { playback, queue } = stateRef.current;
      if (!isDjRef.current || !playback?.playing || !playback.trackId) return;
      const tr = queue.find((t) => t.id === playback.trackId);
      if (!tr?.duration) return;
      if (expectedPosition(playback, serverNow()) >= tr.duration + 0.4 && advancedFrom.current !== playback.trackId) {
        advancedFrom.current = playback.trackId;
        goNext();
      }
    }, 1000);
    const onEnded = () => {
      const pb = stateRef.current.playback;
      if (isDjRef.current && pb?.trackId && advancedFrom.current !== pb.trackId) {
        advancedFrom.current = pb.trackId;
        goNext();
      }
    };
    engine.el.addEventListener('ended', onEnded);
    return () => {
      clearInterval(id);
      engine.el.removeEventListener('ended', onEnded);
    };
  }, [sync, goNext]);

  // Lock-screen / notification controls on phones.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: currentTrack.title, artist: 'Ziklub', album: `Room ${code}` });
  }, [currentTrack, code]);

  // ----- If the DJ left, the longest-present member takes the aux -----
  useEffect(() => {
    const dj = state.meta?.djUid;
    if (!state.meta || state.meta.closedBy || auxSuccessor(dj, state.members) !== uid) return;
    api.claimAux(code, uid, dj).then((ok) => {
      if (ok) quiet(api.sendSystem(code, uid, 'claim', { name: profileRef.current.name }));
    });
  }, [state.meta, state.members, code, uid]);

  // ----- DJ actions -----
  const position = () => (stateRef.current.playback ? expectedPosition(stateRef.current.playback, serverNow()) : 0);

  const dj = useMemo(
    () => ({
      play() {
        const { playback, queue } = stateRef.current;
        if (playback?.trackId && queue.some((t) => t.id === playback.trackId)) setPlayback(playback.trackId, true, position());
        else if (queue[0]) setPlayback(queue[0].id, true, 0);
      },
      pause() {
        const pb = stateRef.current.playback;
        if (pb?.trackId) setPlayback(pb.trackId, false, position());
      },
      next: goNext,
      previous() {
        const { playback, queue } = stateRef.current;
        const p = previousTrack(queue, playback?.trackId ?? null);
        if (position() > 5 || !p) setPlayback(playback?.trackId ?? null, !!playback?.playing, 0);
        else setPlayback(p.id, true, 0);
      },
      playTrack(t: Track) {
        setPlayback(t.id, true, 0);
      },
      seek(seconds: number) {
        const pb = stateRef.current.playback;
        if (pb?.trackId) setPlayback(pb.trackId, pb.playing, seconds);
      },
      async removeTrack(t: Track) {
        if (stateRef.current.playback?.trackId === t.id) goNext();
        await api.removeTrack(code, t);
      },
      move(t: Track, dir: -1 | 1) {
        quiet(api.moveTrack(code, stateRef.current.queue, t.id, dir));
      },
      async approve(r: SongRequest) {
        const track = await api.approveRequest(code, uid, profileRef.current.name, r);
        this.startIfIdle(track);
      },
      async decline(r: SongRequest) {
        await api.removeRequest(code, r);
      },
      /** Hands the aux to someone before leaving: `to`, or whoever has been here the longest. */
      async handOff(to?: Member) {
        const target = to ?? stateRef.current.members.find((m) => m.uid === nextDj(uid, stateRef.current.members));
        if (!target) return;
        await api.passAux(code, target.uid);
        quiet(api.sendSystem(code, uid, 'aux', { from: profileRef.current.name, to: target.name }));
      },
      /** Closes the room for everyone and erases it. */
      async closeRoom() {
        closingByMe.current = true;
        await api.closeRoom(code, profileRef.current.name);
      },
      /** Start playing a freshly uploaded song if nothing is playing yet. */
      startIfIdle(t: Track) {
        const pb = stateRef.current.playback;
        // Nothing chosen yet, or the queue finished (stopped at 0): play the new song.
        if (!pb?.trackId || (!pb.playing && pb.position === 0)) setPlayback(t.id, true, 0);
      },
    }),
    [code, uid, goNext, setPlayback],
  );

  const resumeSound = useCallback(() => {
    setSoundBlocked(false);
    sync.resume();
  }, [sync]);

  const isCreator = state.meta?.createdBy === uid;
  return { state, ready, messages, requests, isDj, isCreator, currentTrack, dj, soundBlocked, resumeSound, ended, endingSoon };
}
