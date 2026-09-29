import { expectedPosition } from './room';
import type { Playback, Track } from './types';

/**
 * What the sync needs from an audio player. The web implements it with an <audio> element,
 * the Expo app will implement it with expo-audio.
 */
export interface AudioEngine {
  /** URL currently loaded, or null. */
  readonly src: string | null;
  readonly paused: boolean;
  load(url: string): void;
  play(): Promise<void>;
  pause(): void;
  getTime(): number;
  seek(seconds: number): void;
  setRate(rate: number): void;
}

export interface SyncOptions {
  /** Jump straight to the right position when further off than this (seconds). */
  hardThreshold?: number;
  /** Nudge the playback speed when further off than this (seconds). */
  softThreshold?: number;
  /** Called when the browser refuses to start the sound (needs a tap). */
  onBlocked?: () => void;
}

/** Keeps a local player in step with the room's shared playback state. */
export class PlaybackSync {
  private playback: Playback | null = null;
  private track: Track | null = null;
  private readonly hard: number;
  private readonly soft: number;

  constructor(
    private readonly engine: AudioEngine,
    private readonly serverNow: () => number,
    private readonly opts: SyncOptions = {},
  ) {
    this.hard = opts.hardThreshold ?? 0.35;
    this.soft = opts.softThreshold ?? 0.04;
  }

  /** Call whenever the playback state or current track changes. */
  apply(playback: Playback | null, track: Track | null): void {
    this.playback = playback;
    this.track = track;
    if (!playback || !track) {
      if (!this.engine.paused) this.engine.pause();
      return;
    }
    if (this.engine.src !== track.url) this.engine.load(track.url);
    const target = this.target();
    if (Math.abs(this.engine.getTime() - target) > this.hard) this.engine.seek(target);
    if (playback.playing && this.engine.paused) {
      this.engine.play().catch(() => this.opts.onBlocked?.());
    } else if (!playback.playing && !this.engine.paused) {
      this.engine.pause();
      this.engine.seek(target);
    }
    this.engine.setRate(1);
  }

  /** Call about once a second to correct drift. */
  tick(): void {
    const p = this.playback;
    if (!p || !this.track || !p.playing || this.engine.paused) return;
    const target = this.target();
    const diff = this.engine.getTime() - target;
    if (Math.abs(diff) > this.hard) {
      this.engine.seek(target);
      this.engine.setRate(1);
    } else if (Math.abs(diff) > this.soft) {
      // Ahead -> slow down a little, behind -> speed up a little. Inaudible at these amounts.
      this.engine.setRate(1 - Math.max(-0.06, Math.min(0.06, diff * 0.5)));
    } else {
      this.engine.setRate(1);
    }
  }

  /** Try again after the user tapped (autoplay was blocked). */
  resume(): void {
    this.apply(this.playback, this.track);
  }

  private target(): number {
    const t = expectedPosition(this.playback!, this.serverNow());
    const max = this.track?.duration ? Math.max(0, this.track.duration - 0.05) : Infinity;
    return Math.min(t, max);
  }
}
