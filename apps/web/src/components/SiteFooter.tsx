import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** About / Privacy / Terms links and the Jerttech credit. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Ziklub">
        <Link to="/about">{t('footer.about')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/terms">{t('footer.terms')}</Link>
        <Link to="/contact">{t('footer.contact')}</Link>
      </nav>
      <p className="powered">
        {t('footer.poweredBy')} <b>Jerttech</b>
      </p>
    </footer>
  );
}
