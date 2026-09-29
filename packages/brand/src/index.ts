// Ziklub brand tokens. Platform-neutral: used by the web app (as CSS variables) and later by the Expo app.

export const colors = {
  lavender: '#B8A4EC',
  peach: '#FFBFA6',
  mint: '#93DDBF',
  night: '#1C1722',
  brand: '#6A50C2',
  cream: '#F6F3FA',
  ink: '#2A2233',
  coral: '#FF9477',
  pink: '#F7A8C9',
  sky: '#A8CBF0',
  butter: '#FFD97A',
  haze: '#D3CAE4',
} as const;

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
}

export const themes: { light: Theme; dark: Theme } = {
  light: {
    bg: '#F6F3FA',
    surface: '#FFFFFF',
    surface2: '#EEE8F7',
    line: '#E2DAEE',
    fg: '#2A2233',
    muted: '#6C6280',
    accent: '#6A50C2',
    onAccent: '#FFFFFF',
  },
  dark: {
    bg: '#1C1722',
    surface: '#262030',
    surface2: '#30283C',
    line: '#3B3249',
    fg: '#F1ECF7',
    muted: '#AA9FBC',
    accent: '#C4B3F7',
    onAccent: '#1C1722',
  },
};

export const fonts = {
  display: 'Sniglet',
  body: 'Figtree',
  mono: 'DM Mono',
} as const;
