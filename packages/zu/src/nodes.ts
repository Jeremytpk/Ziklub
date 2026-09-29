// A tiny drawing format shared by every platform.
// The web renders these nodes to <svg>, the Expo app will render them with react-native-svg.

export type ZuNode =
  | { t: 'path'; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number; dash?: string; cap?: 'round' | 'butt' }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill: string; stroke?: string; sw?: number }
  | { t: 'text'; x: number; y: number; text: string; size: number; fill: string; anchor?: 'start' | 'middle' }
  | { t: 'g'; transform?: string; children: ZuNode[] }
  | { t: 'clip'; id: string; d: string; children: ZuNode[] };

const r1 = (n: number) => Math.round(n * 10) / 10;

export const P = (d: string, fill: string, opacity?: number): ZuNode => ({ t: 'path', d, fill, opacity });

export const S = (d: string, stroke: string, sw: number, extra: { opacity?: number; dash?: string; cap?: 'round' | 'butt' } = {}): ZuNode => ({
  t: 'path',
  d,
  fill: 'none',
  stroke,
  sw,
  cap: extra.cap ?? 'round',
  opacity: extra.opacity,
  dash: extra.dash,
});

export const C = (cx: number, cy: number, r: number, fill: string, extra: { opacity?: number; stroke?: string; sw?: number } = {}): ZuNode => ({
  t: 'circle',
  cx: r1(cx),
  cy: r1(cy),
  r,
  fill,
  ...extra,
});

export const R = (x: number, y: number, w: number, h: number, rx: number, fill: string, stroke?: string, sw?: number): ZuNode => ({
  t: 'rect',
  x: r1(x),
  y: r1(y),
  w,
  h,
  rx,
  fill,
  stroke,
  sw,
});

export const G = (transform: string, children: ZuNode[]): ZuNode => ({ t: 'g', transform, children });
