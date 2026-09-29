import { describe, expect, it } from 'vitest';
import { auxSuccessor, expectedPosition, generateRoomCode, isValidRoomCode, nextTrack, normalizeRoomCode, previousTrack } from './room';
import { PlaybackSync, type AudioEngine } from './sync';
import type { Track } from './types';

const track = (id: string, addedAt: number): Track => ({ id, title: id, duration: 200, url: `u/${id}`, path: id, addedBy: 'a', addedAt });

describe('room codes', () => {
  it('generates valid codes', () => {
    for (let i = 0; i < 50; i++) expect(isValidRoomCode(generateRoomCode())).toBe(true);
  });
  it('normalizes typed codes', () => {
    expect(normalizeRoomCode(' k7x-q2 ')).toBe('K7XQ2');
  });
});

describe('expectedPosition', () => {
  it('stays put when paused', () => {
    expect(expectedPosition({ trackId: 'a', playing: false, position: 12, updatedAt: 1000 }, 99000)).toBe(12);
  });
  it('advances with server time when playing', () => {
    expect(expectedPosition({ trackId: 'a', playing: true, position: 10, updatedAt: 1000 }, 4000)).toBe(13);
  });
});

describe('queue navigation', () => {
  const q = [track('a', 1), track('b', 2), track('c', 3)];
  it('finds next and previous', () => {
    expect(nextTrack(q, 'a')?.id).toBe('b');
    expect(nextTrack(q, 'c')).toBeNull();
    expect(nextTrack(q, null)?.id).toBe('a');
    expect(previousTrack(q, 'b')?.id).toBe('a');
    expect(previousTrack(q, 'a')).toBeNull();
  });
});

describe('auxSuccessor', () => {
  const m = (uid: string, joinedAt: number) => ({ uid, name: uid, look: {}, joinedAt });
  it('keeps the DJ while present', () => {
    expect(auxSuccessor('a', [m('a', 1), m('b', 2)])).toBeNull();
  });
  it('picks the longest-present member when the DJ left', () => {
    expect(auxSuccessor('x', [m('c', 5), m('b', 2)])).toBe('b');
  });
});

describe('PlaybackSync', () => {
  function fakeEngine() {
    const e = {
      src: null as string | null,
      paused: true,
      time: 0,
      rate: 1,
      load(url: string) { e.src = url; e.time = 0; },
      async play() { e.paused = false; },
      pause() { e.paused = true; },
      getTime: () => e.time,
      seek(s: number) { e.time = s; },
      setRate(r: number) { e.rate = r; },
    };
    return e satisfies AudioEngine & { time: number; rate: number };
  }

  it('loads, seeks and plays to match the room', async () => {
    const e = fakeEngine();
    let now = 10_000;
    const sync = new PlaybackSync(e, () => now);
    sync.apply({ trackId: 'a', playing: true, position: 30, updatedAt: 8_000 }, track('a', 1));
    await Promise.resolve();
    expect(e.src).toBe('u/a');
    expect(e.time).toBeCloseTo(32);
    expect(e.paused).toBe(false);
    // Drifted 0.2s ahead: slows down slightly instead of jumping.
    now = 11_000;
    e.time = 33.2;
    sync.tick();
    expect(e.rate).toBeLessThan(1);
    expect(e.time).toBe(33.2);
    // Drifted 2s: jumps.
    e.time = 35;
    sync.tick();
    expect(e.time).toBeCloseTo(33);
  });
});
