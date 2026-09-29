import { renderEffect, type Effect } from '@ziklub/core';

// DJ effects play through Web Audio, on top of the music (which stays on its own <audio> element).

type Ctx = AudioContext;
let ctx: Ctx | null = null;
const buffers = new Map<Effect, AudioBuffer>();
const MUTE_KEY = 'ziklub.fxMuted';

function context(): Ctx | null {
  if (ctx) return ctx;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  return ctx;
}

/** Must be called from a tap/click: phones only allow Web Audio after a gesture. */
export function unlockFx() {
  const c = context();
  if (!c) return;
  void c.resume();
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start();
}

export function playFx(effect: Effect, volume = 0.8) {
  if (isFxMuted()) return;
  const c = context();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  let buf = buffers.get(effect);
  if (!buf) {
    const data = renderEffect(effect, c.sampleRate);
    buf = c.createBuffer(1, data.length, c.sampleRate);
    buf.getChannelData(0).set(data);
    buffers.set(effect, buf);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(c.destination);
  src.start();
}

export function isFxMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFxMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // ignore
  }
}
