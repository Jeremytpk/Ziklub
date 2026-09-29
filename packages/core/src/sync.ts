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
  /** False while the player is seeking or buffering; its time is not meaningful then. */
  isReady?(): boolean;
}

export interface SyncOptions {
  /** Jump to the right position when further off than this (seconds). */
  hardThreshold?: number;
  /** Start nudging the playback speed when further off than this (seconds). */
  softThreshold?: number;
  /** Stop nudging once back within this (seconds). */
  releaseThreshold?: number;
  /** Speed change used for nudging (0.02 = 2% faster or slower). */
  rateStep?: number;
  /** Speed nudging is smooth in Chrome but can crackle in Safari/iOS: turn it off there. */
  allowRate?: boolean;
  /** Minimum time between two jumps (ms), so a slow device never jumps in a loop. */
  seekCooldownMs?: number;
  /** Clock for cooldowns (ms). */
  now?: () => number;
  /** Called when the browser refuses to start the sound (needs a tap). */
  onBlocked?: () => void;
  /** Debug: receives the measured offset (local - expected, seconds) on each tick. */
  onTick?: (diff: number) => void;
}

const SAMPLES = 3;
const MAX_LEAD = 1.5;
const FAR = 1.5;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

/**
 * Keeps a local player in step with the room's shared playback state.
 *
 * Devices take a moment to resume after a jump (Safari ~0.4 s). The sync measures how late each jump
 * lands and aims that far ahead next time (`lead`), waits between jumps, and ignores readings taken
 * while the player is buffering. Without this, a slow device would jump, land late, jump again... and stutter.
 */
export class PlaybackSync {
  private playback: Playback | null = null;
  private track: Track | null = null;
  private samples: number[] = [];
  private lastSeekAt = -Infinity;
  private checkLead = false;
  private nudging = false;
  /** Learned jump delay for this device (seconds). */
  lead = 0;

  private readonly hard: number;
  private readonly soft: number;
  private readonly release: number;
  private readonly step: number;
  private readonly allowRate: boolean;
  private readonly cooldown: number;
  private readonly now: () => number;

  constructor(
    private readonly engine: AudioEngine,
    private readonly serverNow: () => number,
    private readonly opts: SyncOptions = {},
  ) {
    this.hard = opts.hardThreshold ?? 0.3;
    this.soft = opts.softThreshold ?? 0.08;
    this.release = opts.releaseThreshold ?? 0.025;
    this.step = opts.rateStep ?? 0.02;
    this.allowRate = opts.allowRate ?? true;
    this.cooldown = opts.seekCooldownMs ?? 6000;
    this.now = opts.now ?? Date.now;
  }

  /** Call whenever the playback state or current track changes. */
  apply(playback: Playback | null, track: Track | null): void {
    this.playback = playback;
    this.track = track;
    this.samples = [];
    this.setNudge(false);
    if (!playback || !track) {
      if (!this.engine.paused) this.engine.pause();
      return;
    }
    if (this.engine.src !== track.url) this.engine.load(track.url);
    const target = this.target();
    if (Math.abs(this.engine.getTime() - target) > this.hard) {
      // A state change (new song, play, jump by the DJ) always gets an immediate jump.
      this.jump(target + (playback.playing ? this.lead : 0));
    }
    if (playback.playing && this.engine.paused) {
      this.engine.play().catch(() => this.opts.onBlocked?.());
    } else if (!playback.playing && !this.engine.paused) {
      this.engine.pause();
      this.engine.seek(target);
    }
  }

  /** Call about once a second to correct drift. */
  tick(): void {
    const p = this.playback;
    if (!p || !this.track || !p.playing || this.engine.paused) return;
    if (this.engine.isReady && !this.engine.isReady()) {
      this.samples = []; // buffering or seeking: the reading would be wrong
      return;
    }
    const diff = this.engine.getTime() - this.target();
    this.opts.onTick?.(diff);
    this.samples.push(diff);
    if (this.samples.length > SAMPLES) this.samples.shift();
    // Far off (e.g. the song took a while to start on a slow connection): no need to wait for more readings.
    if (Math.abs(diff) > FAR && this.now() - this.lastSeekAt >= this.cooldown) {
      this.setNudge(false);
      this.jump(this.target() + this.lead);
      return;
    }
    if (this.samples.length < SAMPLES) return;
    const off = median(this.samples);

    if (this.checkLead) {
      // First settled reading after a jump: learn how late (or early) jumps land on this device.
      this.checkLead = false;
      this.lead = Math.max(0, Math.min(MAX_LEAD, this.lead - off));
    }

    if (Math.abs(off) > this.hard) {
      if (this.now() - this.lastSeekAt >= this.cooldown) {
        this.setNudge(false);
        this.jump(this.target() + this.lead);
      }
      return;
    }

    if (!this.allowRate) return;
    if (this.nudging) {
      if (Math.abs(off) < this.release) this.setNudge(false);
    } else if (Math.abs(off) > this.soft) {
      // Ahead -> slightly slower, behind -> slightly faster. One small step, kept until back in sync.
      this.nudging = true;
      this.engine.setRate(off > 0 ? 1 - this.step : 1 + this.step);
    }
  }

  /** Try again after the user tapped (autoplay was blocked). */
  resume(): void {
    this.apply(this.playback, this.track);
  }

  private jump(to: number) {
    this.engine.seek(Math.max(0, to));
    this.lastSeekAt = this.now();
    this.samples = [];
    this.checkLead = true;
  }

  private setNudge(on: boolean) {
    this.nudging = on;
    if (!on) this.engine.setRate(1);
  }

  private target(): number {
    const t = expectedPosition(this.playback!, this.serverNow());
    const max = this.track?.duration ? Math.max(0, this.track.duration - 0.05) : Infinity;
    return Math.min(t, max);
  }
}
