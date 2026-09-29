import { detectLanguage, LANGUAGES, resources, type Language } from '@ziklub/i18n';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const KEY = 'ziklub.lang';

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  } catch {
    // ignore
  }
  return detectLanguage(navigator.languages ?? [navigator.language]);
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

document.documentElement.lang = i18n.language;

export function toggleLanguage() {
  const next: Language = i18n.language === 'fr' ? 'en' : 'fr';
  i18n.changeLanguage(next);
  document.documentElement.lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // ignore
  }
}

export default i18n;
