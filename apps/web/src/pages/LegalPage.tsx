import { LEGAL, LEGAL_UPDATED, type LegalPageId } from '@ziklub/i18n';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { IconBack } from '../components/Icons';
import { LangToggle } from '../components/LangToggle';
import { LogoMark } from '../components/Logo';
import { SiteFooter } from '../components/SiteFooter';

const CONTACT = /(contact(?:e|er)? Jerttech)/gi;

/** Turns every "contact Jerttech" in the text into a link to the contact page. */
function withContactLinks(text: string, topic?: string): ReactNode {
  const parts = text.split(CONTACT);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} to={topic ? `/contact?topic=${topic}` : '/contact'}>
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

/** About, Privacy and Terms, rendered from the shared content in @ziklub/i18n. */
export function LegalPage({ page }: { page: LegalPageId }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'fr' ? 'fr' : 'en';
  const content = LEGAL[lang][page];
  const date = new Date(LEGAL_UPDATED + 'T12:00:00').toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    document.title = `${content.title} · Ziklub`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'Ziklub';
    };
  }, [content.title]);

  return (
    <main className="legal">
      <header className="legal-top">
        <Link to="/" className="icon-btn" aria-label={t('footer.back')}>
          <IconBack />
        </Link>
        <Link to="/" aria-label="Ziklub">
          <LogoMark size={40} />
        </Link>
        <LangToggle />
      </header>
      <article className="legal-body">
        <h1>{content.title}</h1>
        {page !== 'about' && <p className="legal-date">{t('footer.updated', { date })}</p>}
        <p className="legal-intro">{content.intro}</p>
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p}>{withContactLinks(p, page === 'privacy' ? 'privacy' : undefined)}</p>
            ))}
            {s.bullets && (
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{withContactLinks(b, /copyright|rights holder|droits|ayant droit/i.test(b) ? 'copyright' : undefined)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
      <SiteFooter />
    </main>
  );
}
