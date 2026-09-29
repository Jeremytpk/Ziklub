import { en } from './en';
import { fr } from './fr';

export type { Messages } from './en';

export const LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** i18next-style resources, usable by react-i18next on web and Expo. */
export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

/** French if any preferred language is French, English otherwise. */
export function detectLanguage(preferred: readonly string[] = []): Language {
  return preferred.some((l) => l.toLowerCase().startsWith('fr')) ? 'fr' : 'en';
}
export * from './legal';
