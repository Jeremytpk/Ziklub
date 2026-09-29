import type { ZuLook } from './look';

// The Zu body is a soft closed curve whose radius wobbles over time.
// Same maths on every platform: the web animates `phase` with requestAnimationFrame, Expo can use Reanimated.

interface Wave {
  k: number; // number of bumps around the body
  a: number; // strength (fraction of the radius)
  w: number; // speed (radians per second)
  p: number; // phase offset
}

const SHAPES: Record<ZuLook['shape'], { sx: number; sy: number; dy: number; waves: Wave[] }> = {
  round: { sx: 1, sy: 1, dy: 0, waves: [{ k: 2, a: 0.035, w: 0.9, p: 0 }, { k: 3, a: 0.025, w: 1.3, p: 1 }] },
  bean: { sx: 1.03, sy: 0.97, dy: 1, waves: [{ k: 1, a: 0.05, w: 0.7, p: 0.4 }, { k: 2, a: 0.06, w: 1.0, p: 2 }, { k: 3, a: 0.02, w: 1.5, p: 0 }] },
  pebble: { sx: 1.04, sy: 0.93, dy: 4, waves: [{ k: 2, a: 0.04, w: 0.8, p: 1.2 }, { k: 4, a: 0.018, w: 1.4, p: 0 }] },
};

const N = 16;

/** SVG path of the body. `phase` is time in seconds (0 for a still pose). */
export function blobPath(shape: ZuLook['shape'], phase = 0, cx = 80, cy = 96, r = 60): string {
  const s = SHAPES[shape] ?? SHAPES.round;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    let m = 1;
    for (const wv of s.waves) m += wv.a * Math.sin(wv.k * th + wv.p + wv.w * phase);
    pts.push([cx + Math.cos(th) * r * s.sx * m, cy + s.dy + Math.sin(th) * r * s.sy * m]);
  }
  // Closed Catmull-Rom spline converted to cubic Béziers.
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
