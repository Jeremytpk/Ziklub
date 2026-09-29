import { describe, expect, it } from 'vitest';
import { EFFECTS, renderEffect } from './effects';
import { auxSuccessor, moveInQueue, sortQueue, expectedPosition, generateRoomCode, isValidRoomCode, nextTrack, normalizeRoomCode, previousTrack } from './room';
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
  /**
   * A fake player. `seekDelay` simulates Safari: after a jump, the sound resumes late,
   * so the player's time lands `seekDelay` seconds behind where it was asked to go.
   */
  function fakeEngine(seekDelay = 0) {
    const e = {
      src: null as string | null,
      paused: true,
      time: 0,
      rate: 1,
      seeks: 0,
      rateChanges: 0,
      load(url: string) { e.src = url; e.time = 0; },
      async play() { e.paused = false; },
      pause() { e.paused = true; },
      getTime: () => e.time,
      seek(s: number) { e.seeks++; e.time = s - seekDelay; },
      setRate(r: number) { if (r !== e.rate) e.rateChanges++; e.rate = r; },
      /** Advance real time by `sec` seconds while playing. */
      advance(sec: number) { if (!e.paused) e.time += sec * e.rate; },
    };
    return e satisfies AudioEngine;
  }

  function setup(seekDelay = 0, allowRate = true) {
    const e = fakeEngine(seekDelay);
    const clock = { now: 100_000 };
    const sync = new PlaybackSync(e, () => clock.now, { allowRate, now: () => clock.now });
    const run = (seconds: number) => {
      for (let i = 0; i < seconds; i++) {
        clock.now += 1000;
        e.advance(1);
        sync.tick();
      }
    };
    return { e, clock, sync, run };
  }

  it('loads, seeks and plays to match the room', async () => {
    const { e, sync, clock } = setup();
    sync.apply({ trackId: 'a', playing: true, position: 30, updatedAt: clock.now - 2000 }, track('a', 1));
    await Promise.resolve();
    expect(e.src).toBe('u/a');
    expect(e.time).toBeCloseTo(32);
    expect(e.paused).toBe(false);
  });

  it('nudges the speed for small drift instead of jumping', () => {
    const { e, sync, clock, run } = setup();
    sync.apply({ trackId: 'a', playing: true, position: 0, updatedAt: clock.now }, track('a', 1));
    e.time += 0.15; // 150 ms ahead
    run(3);
    expect(e.seeks).toBe(0); // small drift: no jump at all
    expect(e.rate).toBeLessThan(1);
    run(10);
    expect(e.rate).toBe(1); // back in sync, normal speed
    expect(Math.abs(e.time - (clock.now - 100_000) / 1000)).toBeLessThan(0.05);
  });

  it('does not stutter on a device that resumes late after each jump (Safari)', () => {
    const { e, sync, clock, run } = setup(0.45, false);
    sync.apply({ trackId: 'a', playing: true, position: 10, updatedAt: clock.now }, track('a', 1));
    run(60);
    // Old behaviour: a jump every second. Now: it learns the delay and settles after a jump or two.
    expect(e.seeks).toBeLessThanOrEqual(3);
    expect(sync.lead).toBeCloseTo(0.45, 1);
    const expected = 10 + (clock.now - 100_000) / 1000;
    expect(Math.abs(e.time - expected)).toBeLessThan(0.1);
    expect(e.rateChanges).toBe(0);
  });

  it('never jumps twice within the cooldown', () => {
    const { e, sync, clock, run } = setup(0.45, false);
    sync.apply({ trackId: 'a', playing: true, position: 0, updatedAt: clock.now }, track('a', 1));
    const before = e.seeks;
    run(5);
    expect(e.seeks - before).toBeLessThanOrEqual(1);
  });

  it('corrects a big drift with a jump', () => {
    const { e, sync, clock, run } = setup();
    sync.apply({ trackId: 'a', playing: true, position: 0, updatedAt: clock.now }, track('a', 1));
    run(10);
    e.time += 3; // e.g. the phone was busy
    run(4);
    expect(Math.abs(e.time - (clock.now - 100_000) / 1000)).toBeLessThan(0.1);
  });
});

describe('queue reordering', () => {
  const q = sortQueue([track('a', 1), track('b', 2), track('c', 3)]);
  const apply = (orders: Record<string, number> | null) => sortQueue(q.map((t) => (orders && t.id in orders ? { ...t, order: orders[t.id] } : t))).map((t) => t.id);
  it('moves a song up or down one place', () => {
    expect(apply(moveInQueue(q, 'c', -1))).toEqual(['a', 'c', 'b']);
    expect(apply(moveInQueue(q, 'a', 1))).toEqual(['b', 'a', 'c']);
  });
  it('does nothing at the ends', () => {
    expect(moveInQueue(q, 'a', -1)).toBeNull();
    expect(moveInQueue(q, 'c', 1)).toBeNull();
  });
});

describe('DJ effects', () => {
  it.each(EFFECTS)('%s renders clean audio', (fx) => {
    const s = renderEffect(fx, 22050);
    expect(s.length).toBeGreaterThan(22050 * 0.4);
    expect(s.length).toBeLessThan(22050 * 3);
    let peak = 0;
    for (const x of s) {
      expect(Number.isFinite(x)).toBe(true);
      peak = Math.max(peak, Math.abs(x));
    }
    expect(peak).toBeGreaterThan(0.3); // audible
    expect(peak).toBeLessThanOrEqual(1); // no clipping
  });
});
