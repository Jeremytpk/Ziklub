// DJ sound effects, synthesised from maths: no audio files, no licensing, identical on every device.
// Platform-neutral: returns raw samples. The web plays them with Web Audio; Expo can write them to a WAV file.

export const EFFECTS = ['airhorn', 'rewind', 'scratch', 'drop', 'siren', 'crowd', 'laser', 'drumroll'] as const;
export type Effect = (typeof EFFECTS)[number];

export function isEffect(v: unknown): v is Effect {
  return typeof v === 'string' && (EFFECTS as readonly string[]).includes(v);
}

const TAU = Math.PI * 2;

/** Small seeded random generator, so the "random" parts sound the same everywhere. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Band-pass filter (state-variable) whose centre frequency can change every sample. */
function bandpass(sr: number, q = 0.5) {
  let low = 0;
  let band = 0;
  return (x: number, fc: number) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, sr / 6)) / sr);
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    return band;
  };
}

const saw = (phase: number) => 2 * (phase - Math.floor(phase + 0.5));
const env = (t: number, attack: number, len: number, release = 0.05) =>
  t < 0 || t > len ? 0 : Math.min(1, t / attack) * Math.min(1, (len - t) / release);

function normalize(out: Float32Array, peak = 0.85): Float32Array {
  let max = 0;
  for (let i = 0; i < out.length; i++) max = Math.max(max, Math.abs(out[i]));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * peak;
  return out;
}

type Synth = (sr: number) => Float32Array;

const SYNTHS: Record<Effect, Synth> = {
  // Three short blasts and a long one, gritty like a stadium horn.
  airhorn(sr) {
    const blasts = [[0, 0.16], [0.22, 0.16], [0.44, 0.16], [0.66, 0.75]];
    const out = new Float32Array(Math.ceil(sr * 1.5));
    let p1 = 0, p2 = 0, p3 = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let a = 0;
      for (const [s, l] of blasts) a = Math.max(a, env(t - s, 0.012, l, 0.04));
      const bend = 1 - 0.03 * Math.exp(-((t % 0.22) * 30));
      p1 += (466 * bend) / sr;
      p2 += (470 * bend) / sr;
      p3 += (587 * bend) / sr;
      const x = saw(p1) + saw(p2) + 0.6 * saw(p3);
      out[i] = Math.tanh(2.2 * x) * a;
    }
    return normalize(out);
  },

  // Tape/vinyl rewind: a pitch that races down with a wobble.
  rewind(sr) {
    const len = 1.1;
    const out = new Float32Array(Math.ceil(sr * len));
    const bp = bandpass(sr, 0.4);
    const r = rng(7);
    let p = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const f = 900 * Math.exp(-2.2 * t) * (1 + 0.35 * Math.sin(TAU * 11 * t));
      p += f / sr;
      const tone = saw(p) * 0.7 + bp(r() * 2 - 1, f * 3) * 1.5;
      out[i] = tone * env(t, 0.01, len, 0.25);
    }
    return normalize(out);
  },

  // Two back-and-forth record scratches.
  scratch(sr) {
    const len = 0.7;
    const out = new Float32Array(Math.ceil(sr * len));
    const bp = bandpass(sr, 0.25);
    const r = rng(3);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const stroke = Math.abs(Math.sin(TAU * 2.9 * t)); // speed of the hand
      const fc = 250 + 2600 * stroke;
      const gate = Math.pow(stroke, 0.6);
      out[i] = bp(r() * 2 - 1, fc) * gate * env(t, 0.005, len, 0.05);
    }
    return normalize(out);
  },

  // Bass drop: a punchy hit falling into a deep boom.
  drop(sr) {
    const len = 1.7;
    const out = new Float32Array(Math.ceil(sr * len));
    const r = rng(11);
    let p = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const f = 38 + 150 * Math.exp(-5 * t);
      p += f / sr;
      const boom = Math.sin(TAU * p) * Math.exp(-1.6 * t);
      const click = (r() * 2 - 1) * Math.exp(-t * 60) * 0.6;
      out[i] = Math.tanh(1.8 * (boom + click));
    }
    return normalize(out);
  },

  // Dub siren with echoes.
  siren(sr) {
    const len = 2.2;
    const out = new Float32Array(Math.ceil(sr * len));
    let p = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const lfo = 3 + 4 * t; // speeds up
      const f = 700 + 450 * Math.sin(TAU * lfo * t);
      p += f / sr;
      out[i] = (p % 1 < 0.5 ? 0.6 : -0.6) * env(t, 0.02, 1.4, 0.2);
    }
    const d = Math.floor(sr * 0.19);
    for (let i = d; i < out.length; i++) out[i] += out[i - d] * 0.45;
    return normalize(out);
  },

  // A crowd clapping and cheering.
  crowd(sr) {
    const len = 2.4;
    const out = new Float32Array(Math.ceil(sr * len));
    const r = rng(21);
    const claps: number[] = [];
    for (let k = 0; k < 90; k++) claps.push(r() * 2.1);
    const bp = bandpass(sr, 0.6);
    const cheer = bandpass(sr, 0.9);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let c = 0;
      for (const s of claps) {
        const d = t - s;
        if (d >= 0 && d < 0.03) c += Math.exp(-d * 180);
      }
      const n = r() * 2 - 1;
      const swell = Math.sin(Math.PI * Math.min(1, t / len));
      out[i] = bp(n * c, 1400) * 1.4 + cheer(n, 900 + 300 * Math.sin(TAU * 0.8 * t)) * 0.35 * swell;
    }
    return normalize(out);
  },

  // Pew pew pew.
  laser(sr) {
    const len = 0.6;
    const out = new Float32Array(Math.ceil(sr * len));
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const k = Math.floor(t / 0.17);
      const lt = t - k * 0.17;
      if (k > 2 || lt > 0.14) continue;
      const f = 2400 * Math.exp(-lt * 22) + 180;
      const ph = (2400 / 22) * (1 - Math.exp(-lt * 22)) + 180 * lt; // integral of f
      out[i] = Math.sin(TAU * ph) * (f > 0 ? 1 : 0) * env(lt, 0.002, 0.14, 0.03);
    }
    return normalize(out, 0.7);
  },

  // Snare roll speeding up, ending on a crash.
  drumroll(sr) {
    const len = 2.6;
    const out = new Float32Array(Math.ceil(sr * len));
    const r = rng(5);
    const hits: number[] = [];
    for (let t = 0, rate = 10; t < 1.6; t += 1 / rate, rate = Math.min(32, rate * 1.07)) hits.push(t);
    const snare = bandpass(sr, 0.7);
    const crash = bandpass(sr, 0.3);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const n = r() * 2 - 1;
      let s = 0;
      for (const h of hits) {
        const d = t - h;
        if (d >= 0 && d < 0.08) s += Math.exp(-d * 45) * (0.4 + 0.6 * (h / 1.6));
      }
      const c = t >= 1.65 ? Math.exp(-(t - 1.65) * 2.4) : 0;
      out[i] = snare(n * s, 2200) * 1.2 + crash(n * c, 6000) * 0.9;
    }
    return normalize(out);
  },
};

/** Mono samples (-1..1) for an effect at the given sample rate. */
export function renderEffect(effect: Effect, sampleRate: number): Float32Array {
  return SYNTHS[effect](sampleRate);
}
