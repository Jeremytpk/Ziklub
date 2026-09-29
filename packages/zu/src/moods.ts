import { colors } from '@ziklub/brand';
import { C, P, S, type ZuNode } from './nodes';

// The 8 mood reactions. Faces are drawn in a 40 x 28 box. Labels live in @ziklub/i18n under "mood.<key>".

export const MOODS = ['fire', 'dance', 'love', 'feels', 'blown', 'sleep', 'banger', 'replay'] as const;
export type Mood = (typeof MOODS)[number];

const INK = colors.ink;
const W = '#FFFFFF';
const HEART = '#E0467C';
const STAR = (x: number) =>
  ({ t: 'path', d: `M${x} 4l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z`, fill: '#FFF3B0', stroke: INK, sw: 1.4 }) as ZuNode;
const heart = (x: number) => P(`M${x} 15.5C${x - 5.5} 11.5 ${x - 4.5} 5.5 ${x} 8.2 ${x + 4.5} 5.5 ${x + 5.5} 11.5 ${x} 15.5Z`, HEART);

export const MOOD_COLOR: Record<Mood, string> = {
  fire: colors.butter,
  dance: colors.mint,
  love: colors.pink,
  feels: colors.sky,
  blown: colors.butter,
  sleep: colors.haze,
  banger: colors.lavender,
  replay: colors.peach,
};

/** Face nodes. `fire` has two layers: `calm` (excited) and `lit` (turned into a flame). */
export const MOOD_FACE: Record<Mood, ZuNode[]> & { fireLit: ZuNode[] } = {
  fire: [C(13, 10, 3.6, INK), C(27, 10, 3.6, INK), C(14.3, 8.4, 1.3, W), C(28.3, 8.4, 1.3, W), P('M11 16Q20 28 29 16Z', INK)],
  fireLit: [STAR(13), STAR(27), P('M11 18Q20 30 29 18Z', INK)],
  dance: [S('M9.5 11.5l3.5-3.5 3.5 3.5M23.5 11.5l3.5-3.5 3.5 3.5', INK, 2.4), S('M13 17q7 7 14 0', INK, 2.4)],
  love: [heart(13), heart(27), S('M16 20q4 3.5 8 0', INK, 2.4)],
  feels: [
    C(13, 10, 3, INK), C(27, 10, 3, INK), C(14, 8.8, 1, W), C(28, 8.8, 1, W),
    P('M11 15q-2 4 0 5.5 2-1.5 0-5.5Z', '#4F8FD6'),
    S('M14.5 21q2.75-2 5.5 0t5.5 0', INK, 2.4),
  ],
  blown: [C(13, 10, 4.4, INK), C(27, 10, 4.4, INK), C(14.4, 8.6, 1.5, W), C(28.4, 8.6, 1.5, W), { t: 'ellipse', cx: 20, cy: 21, rx: 3, ry: 3.8, fill: INK }],
  sleep: [
    S('M9 11q4 2.5 8 0M23 11q4 2.5 8 0', INK, 2.4),
    { t: 'ellipse', cx: 20, cy: 19, rx: 2, ry: 1.6, fill: INK },
    { t: 'text', x: 33, y: 0, text: 'z', size: 9, fill: INK },
    { t: 'text', x: 39, y: -6, text: 'z', size: 6, fill: INK },
  ],
  banger: [P('M6 7h12v3.5q0 4.5-6 4.5-6 0-6-4.5ZM22 7h12v3.5q0 4.5-6 4.5-6 0-6-4.5Z', INK), S('M18 8h4', INK, 2.4), P('M12 18Q20 26 28 18Z', INK)],
  replay: [C(13, 10, 3, INK), S('M23.5 10.5q3.5-3.5 7 0', INK, 2.4), S('M13 17q7 6 14 0', INK, 2.4), P('M18.5 20.5q1.5 4.5 4 0', HEART)],
};

export function isMood(v: unknown): v is Mood {
  return typeof v === 'string' && (MOODS as readonly string[]).includes(v);
}
