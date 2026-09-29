import { colors } from '@ziklub/brand';

// Each palette entry: [main, dark, light?]. Labels live in @ziklub/i18n under "zu.color.<key>".

export const BODY = {
  mint: colors.mint,
  pink: colors.pink,
  peach: colors.peach,
  sky: colors.sky,
  butter: colors.butter,
  lav: colors.lavender,
  coral: colors.coral,
  haze: colors.haze,
} as const;

export const HAIR_COLORS = {
  black: ['#221C1E', '#0F0B0C', '#4A3F43'],
  dbrown: ['#4B2E22', '#2E1B13', '#6E4736'],
  brown: ['#8A5A3B', '#62402A', '#AD7A53'],
  blond: ['#E8C268', '#C99E3F', '#F7DE9C'],
  red: ['#B5502E', '#8A3A1F', '#D5744E'],
} as const;

export const ACC_COLORS = {
  black: ['#26232C', '#111015'],
  white: ['#F5F3F8', '#CFCAD9'],
  red: ['#E0453A', '#A92E25'],
  blue: ['#2F5BD3', '#1F3F98'],
  pink: ['#F58BB7', '#C9628C'],
} as const;

export const METALS = {
  gold: ['#F2C14E', '#B8862A'],
  silver: ['#D3DAE2', '#8E99A6'],
  rose: ['#EBA58C', '#B8705A'],
  ice: ['#D8F6FF', '#7FBFD6'],
  steel: ['#3A3640', '#1C1A20'],
} as const;

export type BodyColor = keyof typeof BODY;
export type HairColor = keyof typeof HAIR_COLORS;
export type AccColor = keyof typeof ACC_COLORS;
export type Metal = keyof typeof METALS;
