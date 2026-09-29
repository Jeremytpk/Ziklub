import { ACC_COLORS, BODY, HAIR_COLORS, METALS } from './palettes';

// Every option list is the single source of truth: types, validation, random looks and builder UI all come from here.
export const SHAPES = ['round', 'bean', 'pebble'] as const;
export const EXPRESSIONS = ['smile', 'laugh', 'teeth', 'mad', 'sad'] as const;
export const TEETH = ['clean', 'one', 'full'] as const;
export const HAIRS = ['none', 'fade', 'part', 'afro', 'puffs', 'locs', 'long', 'bob'] as const;
export const BEARDS = ['none', 'stubble', 'mustache', 'goatee', 'short', 'full', 'long'] as const;
export const HATS = ['none', 'cap', 'beanie', 'durag', 'bucket', 'phones', 'bow', 'flower', 'crown'] as const;
export const CHAINS = ['none', 'thin', 'cuban', 'rope', 'pendant'] as const;
export const GLASSES = ['none', 'round', 'shades'] as const;

export interface ZuLook {
  body: keyof typeof BODY;
  shape: (typeof SHAPES)[number];
  expr: (typeof EXPRESSIONS)[number];
  teeth: (typeof TEETH)[number];
  teethM: keyof typeof METALS;
  hair: (typeof HAIRS)[number];
  hairC: keyof typeof HAIR_COLORS;
  beard: (typeof BEARDS)[number];
  beardC: keyof typeof HAIR_COLORS;
  hat: (typeof HATS)[number];
  hatC: keyof typeof ACC_COLORS;
  chain: (typeof CHAINS)[number];
  chainM: keyof typeof METALS;
  glasses: (typeof GLASSES)[number];
  glassC: keyof typeof ACC_COLORS;
}

export type LookKey = keyof ZuLook;

export const LOOK_VALUES: { [K in LookKey]: readonly ZuLook[K][] } = {
  body: Object.keys(BODY) as ZuLook['body'][],
  shape: SHAPES,
  expr: EXPRESSIONS,
  teeth: TEETH,
  teethM: Object.keys(METALS) as ZuLook['teethM'][],
  hair: HAIRS,
  hairC: Object.keys(HAIR_COLORS) as ZuLook['hairC'][],
  beard: BEARDS,
  beardC: Object.keys(HAIR_COLORS) as ZuLook['beardC'][],
  hat: HATS,
  hatC: Object.keys(ACC_COLORS) as ZuLook['hatC'][],
  chain: CHAINS,
  chainM: Object.keys(METALS) as ZuLook['chainM'][],
  glasses: GLASSES,
  glassC: Object.keys(ACC_COLORS) as ZuLook['glassC'][],
};

export const DEFAULT_LOOK: ZuLook = {
  body: 'lav',
  shape: 'round',
  expr: 'smile',
  teeth: 'clean',
  teethM: 'gold',
  hair: 'none',
  hairC: 'black',
  beard: 'none',
  beardC: 'black',
  hat: 'none',
  hatC: 'black',
  chain: 'none',
  chainM: 'gold',
  glasses: 'none',
  glassC: 'black',
};

/** Turns anything (e.g. a look read from the database) into a valid look. Unknown values fall back to defaults. */
export function sanitizeLook(input: unknown): ZuLook {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_LOOK } as Record<LookKey, string>;
  (Object.keys(LOOK_VALUES) as LookKey[]).forEach((k) => {
    const v = src[k];
    if (typeof v === 'string' && (LOOK_VALUES[k] as readonly string[]).includes(v)) out[k] = v;
  });
  return out as unknown as ZuLook;
}

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function randomLook(): ZuLook {
  return {
    body: pick(LOOK_VALUES.body),
    shape: pick(SHAPES),
    expr: pick(['smile', 'laugh', 'teeth', 'teeth', 'mad', 'sad'] as const),
    teeth: pick(TEETH),
    teethM: pick(LOOK_VALUES.teethM),
    hair: pick(HAIRS),
    hairC: pick(LOOK_VALUES.hairC),
    beard: pick(['none', 'none', 'stubble', 'mustache', 'goatee', 'short', 'full', 'long'] as const),
    beardC: pick(LOOK_VALUES.beardC),
    hat: pick(['none', 'none', 'cap', 'beanie', 'durag', 'bucket', 'phones', 'bow', 'flower'] as const),
    hatC: pick(LOOK_VALUES.hatC),
    chain: pick(CHAINS),
    chainM: pick(LOOK_VALUES.chainM),
    glasses: pick(['none', 'none', 'round', 'shades'] as const),
    glassC: pick(LOOK_VALUES.glassC),
  };
}

// ----- Builder layout (tabs and groups). Labels are i18n keys. -----

export type ColorPalette = 'body' | 'hair' | 'acc' | 'metal';

export interface BuilderGroup {
  key: LookKey;
  label: string;
  /** When set, the group shows colour swatches from this palette instead of text options. */
  palette?: ColorPalette;
  /** Values the user can pick (defaults to all values for the key). */
  values?: readonly string[];
  when?: (look: ZuLook) => boolean;
}

export interface BuilderTab {
  id: string;
  label: string;
  groups: BuilderGroup[];
}

export const BUILDER_TABS: BuilderTab[] = [
  {
    id: 'body',
    label: 'zu.tab.body',
    groups: [
      { key: 'body', label: 'zu.group.color', palette: 'body' },
      { key: 'shape', label: 'zu.group.shape' },
    ],
  },
  {
    id: 'face',
    label: 'zu.tab.face',
    groups: [
      { key: 'expr', label: 'zu.group.expr' },
      { key: 'teeth', label: 'zu.group.teeth', when: (l) => l.expr === 'teeth' },
      { key: 'teethM', label: 'zu.group.grill', palette: 'metal', when: (l) => l.expr === 'teeth' && l.teeth !== 'clean' },
    ],
  },
  {
    id: 'hair',
    label: 'zu.tab.hair',
    groups: [
      { key: 'hair', label: 'zu.group.style' },
      { key: 'hairC', label: 'zu.group.hairColor', palette: 'hair', when: (l) => l.hair !== 'none' },
    ],
  },
  {
    id: 'beard',
    label: 'zu.tab.beard',
    groups: [
      { key: 'beard', label: 'zu.group.style' },
      { key: 'beardC', label: 'zu.group.beardColor', palette: 'hair', when: (l) => l.beard !== 'none' },
    ],
  },
  {
    id: 'hat',
    label: 'zu.tab.hat',
    groups: [
      // The crown is reserved for the DJ, so it is not offered in the builder.
      { key: 'hat', label: 'zu.group.headwear', values: HATS.filter((h) => h !== 'crown') },
      { key: 'hatC', label: 'zu.group.color', palette: 'acc', when: (l) => !['none', 'flower', 'crown'].includes(l.hat) },
    ],
  },
  {
    id: 'bling',
    label: 'zu.tab.bling',
    groups: [
      { key: 'chain', label: 'zu.group.chain' },
      { key: 'chainM', label: 'zu.group.metal', palette: 'metal', when: (l) => l.chain !== 'none' },
      { key: 'glasses', label: 'zu.group.glasses' },
      { key: 'glassC', label: 'zu.group.frameColor', palette: 'acc', when: (l) => l.glasses !== 'none' },
    ],
  },
];
