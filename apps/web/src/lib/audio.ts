import type { AudioEngine } from '@ziklub/core';

/** A tiny silent WAV, played on the first tap so phones allow sound afterwards. */
function silentWavUrl(): string {
  const rate = 8000;
  const n = 800;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** The web implementation of the shared AudioEngine, on one reusable <audio> element. */
class HtmlAudioEngine implements AudioEngine {
  readonly el: HTMLAudioElement;
  private url: string | null = null;
  private pendingSeek: number | null = null;
  /** Development counters, read by end-to-end tests. */
  readonly stats = { seeks: 0, rateChanges: 0, waiting: 0 };

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.addEventListener('waiting', () => this.stats.waiting++);
    this.el.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek !== null) {
        this.el.currentTime = this.pendingSeek;
        this.pendingSeek = null;
      }
    });
  }

  get src() {
    return this.url;
  }

  get paused() {
    return this.el.paused;
  }

  load(url: string) {
    this.url = url;
    this.pendingSeek = null;
    this.el.src = url;
    this.el.load();
  }

  play() {
    return this.el.play();
  }

  pause() {
    this.el.pause();
  }

  getTime() {
    return this.pendingSeek ?? this.el.currentTime;
  }

  seek(seconds: number) {
    this.stats.seeks++;
    if (this.el.readyState < 1) this.pendingSeek = seconds;
    else this.el.currentTime = seconds;
  }

  isReady() {
    return this.el.readyState >= 3 && !this.el.seeking;
  }

  setRate(rate: number) {
    if (Math.abs(this.el.playbackRate - rate) > 0.001) {
      this.stats.rateChanges++;
      this.el.playbackRate = rate;
    }
  }

  /** Must be called from a tap/click. */
  async unlock() {
    if (this.url) return;
    try {
      this.el.src = silentWavUrl();
      await this.el.play();
      this.el.pause();
    } catch {
      // The room shows a "tap to turn the sound on" button if sound is still blocked.
    }
  }

  stop() {
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    this.url = null;
  }
}

export const engine = new HtmlAudioEngine();

/** Safari and every iPhone/iPad browser use WebKit, where small speed changes can crackle. */
export const isWebKitAudio = (() => {
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
  return iOS || safari;
})();

/** Reads the duration of a local audio file (seconds), or 0 if the browser can't tell. */
export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(file);
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    const timer = setTimeout(() => done(0), 8000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      clearTimeout(timer);
      done(a.duration);
    };
    a.onerror = () => {
      clearTimeout(timer);
      done(0);
    };
    a.src = url;
  });
}

const EXT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
};

/** Audio MIME type of a file, using the extension when the phone doesn't say. */
export function audioType(file: File): string | null {
  if (file.type.startsWith('audio/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPES[ext] ?? null;
}

export function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || name;
}

export function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Development only: lets end-to-end tests check that phones stay in sync.
if (import.meta.env.DEV) Object.assign(window, { __zkAudio: engine.el, __zkStats: engine.stats });
