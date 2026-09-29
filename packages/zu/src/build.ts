import { colors } from '@ziklub/brand';
import type { ZuLook } from './look';
import { C, G, P, R, S, type ZuNode } from './nodes';
import { ACC_COLORS, HAIR_COLORS, METALS } from './palettes';

// Drawing space: 160 x 188. The body is a blob of radius 60 centred on (80, 96).
export const ZU_VIEWBOX = { w: 160, h: 188 } as const;
export const BODY_CENTER = { x: 80, y: 96, r: 60 } as const;

const INK = colors.ink;
const WHITE = '#FFFFFF';

function hair(l: ZuLook): [ZuNode[], ZuNode[]] {
  if (l.hair === 'none') return [[], []];
  const [c, d, lt] = HAIR_COLORS[l.hairC];
  const back: ZuNode[] = [];
  const front: ZuNode[] = [];
  const cap = 'M18 94A62 62 0 0 1 142 94Q134 72 80 68Q26 72 18 94Z';
  const texStrand = (p: string) => [S(p, c, 9), S(p, d, 9, { dash: '2 6', cap: 'butt', opacity: 0.45 })];

  switch (l.hair) {
    case 'fade':
      front.push(P('M24 84A56 56 0 0 1 136 84Q124 64 80 61Q36 64 24 84Z', c));
      for (const r of [48, 40, 32, 24])
        for (let a = 220; a <= 320; a += 10) {
          const t = (a * Math.PI) / 180;
          front.push(C(80 + r * Math.cos(t), 84 + r * Math.sin(t), 1.3, lt));
        }
      break;
    case 'part':
      front.push(
        P('M18 92A62 62 0 0 1 142 92Q136 74 110 68Q84 64 60 70Q34 76 18 92Z', c),
        P('M38 64Q60 22 124 42Q142 50 144 72Q122 50 90 56Q62 60 38 64Z', c),
        S('M54 50Q80 34 116 44', lt, 3, { opacity: 0.8 }),
        S('M58 44Q63 53 60 63', d, 2.4),
      );
      break;
    case 'afro':
      back.push({ t: 'ellipse', cx: 80, cy: 66, rx: 70, ry: 52, fill: c });
      for (let i = 0; i <= 16; i++) {
        const t = Math.PI * (0.9 + (i * 1.2) / 16);
        back.push(C(80 + 70 * Math.cos(t), 66 + 52 * Math.sin(t), 18, c));
      }
      for (let i = 0; i < 26; i++) {
        const t = Math.PI * (1 + (i % 13) / 13);
        const r = i < 13 ? 52 : 34;
        back.push(C(80 + r * 1.2 * Math.cos(t), 66 + r * Math.sin(t), 2, lt, { opacity: 0.6 }));
      }
      front.push(P('M16 100A64 64 0 0 1 144 100Q136 76 80 70Q24 76 16 100Z', c));
      for (const [x, y] of [[24, 92], [36, 82], [52, 75], [68, 71], [80, 70], [92, 71], [108, 75], [124, 82], [136, 92]]) front.push(C(x, y, 7, c));
      break;
    case 'puffs': {
      const puff = (cx: number, cy: number) => {
        back.push(C(cx, cy, 22, c));
        for (let k = 0; k < 10; k++) {
          const t = (k * Math.PI) / 5;
          back.push(C(cx + 20 * Math.cos(t), cy + 20 * Math.sin(t), 9, c));
        }
        for (let k = 0; k < 7; k++) back.push(C(cx + 11 * Math.cos(k * 0.9), cy + 11 * Math.sin(k * 0.9), 1.8, lt, { opacity: 0.7 }));
      };
      puff(34, 38);
      puff(126, 38);
      front.push(P('M20 90A60 60 0 0 1 140 90Q132 70 80 66Q28 70 20 90Z', c), S('M80 36V66', d, 2), C(50, 48, 5, ACC_COLORS.pink[0]), C(110, 48, 5, ACC_COLORS.pink[0]));
      break;
    }
    case 'locs':
      back.push(P('M16 96A64 64 0 0 1 144 96Z', c));
      for (const x of [20, 29, 38, 122, 131, 140]) {
        const dir = x < 80 ? -1 : 1;
        back.push(...texStrand(`M${x} 64Q${x + dir * 6} 110 ${x - dir * 2} 138T${x + dir * 2} 172`));
      }
      front.push(P(cap, c));
      for (const x of [26, 134]) {
        front.push(...texStrand(`M${x} 76Q${x < 80 ? x - 6 : x + 6} 112 ${x} 150`), R(x - 6, 118, 12, 5, 2, METALS.gold[0]));
      }
      front.push(S('M44 58Q64 44 90 46', lt, 2.5, { opacity: 0.6 }));
      break;
    case 'long':
      back.push(P('M22 88Q8 150 26 182L134 182Q152 150 138 88A58 58 0 0 0 22 88Z', c));
      front.push(
        P('M18 96A62 62 0 0 1 142 96Q128 70 96 66Q70 72 52 66Q30 70 18 96Z', c),
        P('M18 92Q12 140 26 178L42 176Q30 132 36 90Z', c),
        P('M142 92Q148 140 134 178L118 176Q130 132 124 90Z', c),
        S('M40 52Q62 38 90 42', lt, 3, { opacity: 0.8 }),
        S('M26 110Q24 140 32 166', lt, 2, { opacity: 0.6 }),
        S('M134 110Q136 140 128 166', lt, 2, { opacity: 0.6 }),
      );
      break;
    case 'bob':
      back.push(P('M20 90Q14 128 24 138L136 138Q146 128 140 90A60 60 0 0 0 20 90Z', c));
      front.push(
        P('M18 98A62 62 0 0 1 142 98L142 132Q134 138 126 132L126 88Q122 74 80 73Q38 74 34 88L34 132Q26 138 18 132Z', c),
        S('M42 50Q64 38 92 42', lt, 3, { opacity: 0.8 }),
      );
      break;
  }
  return [back, front];
}

function beard(l: ZuLook): [ZuNode[], ZuNode[]] {
  if (l.beard === 'none') return [[], []];
  const [c, d] = HAIR_COLORS[l.beardC];
  const must = [P('M62 103Q70 94 80 99Q90 94 98 103Q90 101 80 104Q70 101 62 103Z', c)];
  switch (l.beard) {
    case 'stubble': {
      const dots: ZuNode[] = [];
      for (let y = 100; y <= 152; y += 5)
        for (let x = 26 + ((y / 5) % 2) * 2.5; x <= 134; x += 5) {
          const inBody = Math.hypot(x - 80, y - 96) < 57;
          const inJaw = ((x - 80) / 50) ** 2 + ((y - 130) / 32) ** 2 < 1;
          if (inBody && inJaw) dots.push(C(x, y, 1.15, c, { opacity: 0.55 }));
        }
      return [dots, []];
    }
    case 'mustache':
      return [[], must];
    case 'goatee':
      return [[P('M67 116Q80 110 93 116Q96 134 80 140Q64 134 67 116Z', c)], must];
    case 'short':
      return [[P('M24 100Q26 150 80 154Q134 150 136 100Q130 112 118 108Q108 124 80 125Q52 124 42 108Q30 112 24 100Z', c)], must];
    case 'full':
      return [
        [
          P('M22 96Q20 158 80 168Q140 158 138 96Q130 110 118 106Q108 122 80 124Q52 122 42 106Q30 110 22 96Z', c),
          S('M60 140Q66 152 72 156M88 156Q94 152 100 140', d, 2, { opacity: 0.5 }),
        ],
        must,
      ];
    case 'long':
      return [
        [
          P('M22 96Q16 150 50 172Q66 184 80 188Q94 184 110 172Q144 150 138 96Q130 110 118 106Q108 122 80 124Q52 122 42 106Q30 110 22 96Z', c),
          S('M62 140Q68 162 74 178M86 178Q92 162 98 140M80 132V184', d, 2, { opacity: 0.45 }),
        ],
        must,
      ];
  }
}

function eyes(l: ZuLook): ZuNode[] {
  const eye = (x: number) => [C(x, 90, 4.6, INK), C(x + 1.6, 88.4, 1.5, WHITE)];
  switch (l.expr) {
    case 'laugh':
      return [S('M59 92Q66 83 73 92M87 92Q94 83 101 92', INK, 3.2)];
    case 'mad':
      return [...eye(66), ...eye(94), S('M56 79L73 85M104 79L87 85', INK, 3.2)];
    case 'sad':
      return [...eye(66), ...eye(94), S('M58 84L72 79M102 84L88 79', INK, 3), P('M60 97q-3 6 0 8 3-2 0-8Z', '#4F8FD6')];
    default:
      return [...eye(66), ...eye(94)];
  }
}

function mouth(l: ZuLook, id: string): ZuNode[] {
  switch (l.expr) {
    case 'smile':
      return [S('M69 106Q80 117 91 106', INK, 3.4)];
    case 'mad':
      return [S('M70 113Q80 105 90 113', INK, 3.4)];
    case 'sad':
      return [S('M70 114Q80 106 90 114', INK, 3.4)];
    case 'laugh': {
      const m = 'M67 103Q80 124 93 103Z';
      return [P(m, INK), { t: 'clip', id, d: m, children: [P('M70 118Q80 108 90 118Q80 126 70 118Z', '#E0467C')] }];
    }
    case 'teeth': {
      const m = 'M61 102Q80 132 99 102Q80 107 61 102Z';
      const [mc, md] = METALS[l.teethM];
      const top = (i: number) => (l.teeth === 'full' || (l.teeth === 'one' && i === 1) ? mc : WHITE);
      const teeth: ZuNode[] = [];
      for (let i = 0; i < 6; i++) {
        const f = top(i);
        teeth.push(R(62 + i * 6.1, 100, 5.6, 9, 1.6, f, f === WHITE ? '#D9D2E3' : md, 0.6));
      }
      for (let i = 0; i < 4; i++) {
        const full = l.teeth === 'full';
        teeth.push(R(68.5 + i * 6, 114, 5.4, 8, 1.6, full ? mc : WHITE, full ? md : '#D9D2E3', 0.6));
      }
      if (l.teethM === 'ice' && l.teeth !== 'clean') teeth.push(S('M70 102.5v3M68.5 104h3M88.5 102.5v3M87 104h3', WHITE, 1));
      return [P(m, INK), { t: 'clip', id, d: m, children: teeth }];
    }
  }
}

function glasses(l: ZuLook): ZuNode[] {
  if (l.glasses === 'none') return [];
  const [c] = ACC_COLORS[l.glassC];
  const arms = S('M55 88L38 84M105 88L122 84', c, 2.6);
  if (l.glasses === 'round')
    return [
      C(66, 90, 11, 'rgba(255,255,255,0.18)', { stroke: c, sw: 2.6 }),
      C(94, 90, 11, 'rgba(255,255,255,0.18)', { stroke: c, sw: 2.6 }),
      S('M77 90Q80 87 83 90', c, 2.6),
      arms,
    ];
  return [
    P('M52 84h27v4q0 12-13.5 12T52 88Z', INK),
    P('M81 84h27v4q0 12-13.5 12T81 88Z', INK),
    S('M52 84h56', c, 3),
    S('M57 88l6-2', WHITE, 1.4, { opacity: 0.6 }),
    S('M86 88l6-2', WHITE, 1.4, { opacity: 0.6 }),
    arms,
  ];
}

function hat(l: ZuLook): ZuNode[] {
  if (l.hat === 'none') return [];
  const [c, d] = ACC_COLORS[l.hatC];
  switch (l.hat) {
    case 'cap':
      return [G('translate(25 10) scale(1.333)', [P('M12 30Q12 4 42 4 70 4 70 30Z', c), R(40, 25, 48, 9, 4.5, d), C(42, 6, 3.5, d)])];
    case 'beanie':
      return [G('translate(28 2) scale(1.3)', [C(40, 7, 7, d), P('M10 36Q10 8 40 8 70 8 70 36Z', c), R(6, 30, 68, 12, 6, d)])];
    case 'durag':
      return [
        P('M130 78Q154 108 146 146L136 144Q142 110 122 84Z', d),
        P('M124 80Q142 110 130 150L122 146Q130 112 116 86Z', c),
        P('M20 90A60 60 0 0 1 140 90Q80 74 20 90Z', c),
        S('M22 88Q80 72 138 88', d, 4),
        S('M60 44Q80 38 104 44', d, 1.5, { opacity: 0.5 }),
      ];
    case 'bucket':
      return [
        P('M36 62Q38 24 80 24Q122 24 124 62Z', c),
        P('M16 66Q80 48 144 66Q148 76 138 76Q80 62 22 76Q12 76 16 66Z', d),
        S('M38 56Q80 48 122 56', d, 2, { opacity: 0.6 }),
      ];
    case 'phones':
      return [G('translate(10 8) scale(1.522)', [S('M16 44C16 8 76 8 76 44', c, 6), R(6, 34, 17, 24, 8, d), R(69, 34, 17, 24, 8, d)])];
    case 'bow':
      return [G('translate(94 26) scale(1.08)', [P('M25 15L4 3Q0 15 4 27Z', c), P('M25 15L46 3Q50 15 46 27Z', c), C(25, 15, 6, d)])];
    case 'flower':
      return [
        G('translate(30 26) scale(1.1)', [
          ...[[20, 9], [31, 17], [27, 30], [13, 30], [9, 17]].map(([x, y]) => C(x, y, 7, colors.pink)),
          C(20, 20, 6, colors.butter),
        ]),
      ];
    case 'crown':
      return [G('translate(48 0) scale(1.0667)', [{ t: 'path', d: 'M6 32L2 8l16 12L30 2l12 18 16-12-4 24Z', fill: colors.butter, stroke: '#E0B040', sw: 2 }])];
  }
}

function chain(l: ZuLook): ZuNode[] {
  if (l.chain === 'none') return [];
  const [c, d] = METALS[l.chainM];
  const arc = 'M34 126Q80 172 126 126';
  switch (l.chain) {
    case 'thin':
      return [S(arc, c, 2.8)];
    case 'cuban':
      return [S(arc, d, 8.5), S(arc, c, 6.5, { dash: '5 1.8', cap: 'butt' })];
    case 'rope':
      return [S(arc, c, 5.5), S(arc, d, 5.5, { dash: '1.6 3', cap: 'butt', opacity: 0.55 })];
    case 'pendant':
      return [S(arc, c, 2.8), C(80, 160, 11, c, { stroke: d, sw: 2 }), { t: 'text', x: 80, y: 165, text: 'z', size: 14, fill: d, anchor: 'middle' }];
  }
}

export interface ZuDrawing {
  /** Drawn behind the body (long hair, afro...). */
  back: ZuNode[];
  /** Drawn on top of the body (face, beard, hats...). */
  front: ZuNode[];
}

/**
 * Builds the drawing for a look. `idPrefix` must be unique per rendered avatar (used for clip paths).
 * `opts.crown` puts the DJ crown on, replacing any other headwear.
 */
export function buildZu(look: ZuLook, idPrefix: string, opts: { crown?: boolean } = {}): ZuDrawing {
  const l: ZuLook = opts.crown ? { ...look, hat: 'crown' } : look;
  const [hb, hf] = hair(l);
  const [bb, bm] = beard(l);
  return {
    back: hb,
    front: [...bb, ...chain(l), ...eyes(l), ...mouth(l, `${idPrefix}-m`), ...bm, ...hf, ...glasses(l), ...hat(l)],
  };
}
