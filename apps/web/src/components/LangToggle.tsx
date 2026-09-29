import { useTranslation } from 'react-i18next';
import { toggleLanguage } from '../lib/i18n';

export function LangToggle() {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-ghost btn-small" onClick={toggleLanguage}>
      {t('app.lang')}
    </button>
  );
}
