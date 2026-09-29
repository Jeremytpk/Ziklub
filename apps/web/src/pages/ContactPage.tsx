import { checkFeedback, FEEDBACK_LIMITS, FEEDBACK_TOPICS, sendFeedback, type FeedbackError, type FeedbackTopic } from '@ziklub/core/feedback';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { IconBack } from '../components/Icons';
import { LangToggle } from '../components/LangToggle';
import { LogoMark } from '../components/Logo';
import { MoodBlob } from '../components/MoodBlob';
import { SiteFooter } from '../components/SiteFooter';
import { ensureSignedIn } from '../lib/firebase';
import { firestore } from '../lib/firestore';

/** /contact — send a message or feedback to the team. Stored in Firestore (collection "feedback"). */
export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const initialTopic = (FEEDBACK_TOPICS as readonly string[]).includes(params.get('topic') ?? '') ? (params.get('topic') as FeedbackTopic) : 'feedback';
  const [topic, setTopic] = useState<FeedbackTopic>(initialTopic);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<FeedbackError | 'send' | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    document.title = `${t('contact.title')} · Ziklub`;
    return () => {
      document.title = 'Ziklub';
    };
  }, [t]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { error: problem } = checkFeedback({ topic, message, name, email });
    if (problem) {
      setError(problem);
      return;
    }
    setState('sending');
    setError(null);
    try {
      const user = await ensureSignedIn();
      await sendFeedback(firestore, user.uid, { topic, message, name, email }, { lang: i18n.language, platform: 'web' });
      setState('sent');
      setMessage('');
    } catch {
      setState('idle');
      setError('send');
    }
  };

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

      {state === 'sent' ? (
        <section className="contact-sent" role="status">
          <MoodBlob mood="love" size={96} />
          <h1>{t('contact.sent')}</h1>
          <p>{t('contact.sentHint')}</p>
          <button type="button" className="btn btn-soft" onClick={() => setState('idle')}>
            {t('contact.another')}
          </button>
          <Link to="/" className="btn btn-ghost">
            {t('ended.home')}
          </Link>
        </section>
      ) : (
        <form className="contact-form legal-body" onSubmit={submit} noValidate>
          <h1>{t('contact.title')}</h1>
          <p className="legal-intro">{t('contact.intro')}</p>

          <div className="field">
            <span className="field-label" id="topic-label">
              {t('contact.topic')}
            </span>
            <div className="opts" role="radiogroup" aria-labelledby="topic-label">
              {FEEDBACK_TOPICS.map((k) => (
                <button key={k} type="button" role="radio" className="chip" aria-checked={topic === k} aria-pressed={topic === k} onClick={() => setTopic(k)}>
                  {t(`contact.topics.${k}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-label">{t('contact.message')}</span>
            <textarea
              id="contact-message"
              className="input textarea"
              value={message}
              maxLength={FEEDBACK_LIMITS.message}
              rows={6}
              placeholder={t('contact.messagePlaceholder')}
              aria-invalid={error === 'message-missing' || error === 'message-too-long'}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
            />
            <span className="char-count">{t('contact.count', { count: message.length, max: FEEDBACK_LIMITS.message })}</span>
          </label>

          <label className="field">
            <span className="field-label">{t('contact.name')}</span>
            <input id="contact-name" className="input" value={name} maxLength={FEEDBACK_LIMITS.name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">{t('contact.email')}</span>
            <input
              id="contact-email"
              className="input"
              type="email"
              inputMode="email"
              value={email}
              maxLength={FEEDBACK_LIMITS.email}
              autoComplete="email"
              aria-invalid={error === 'email-invalid'}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error === 'email-invalid') setError(null);
              }}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {t(`contact.errors.${error}`)}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-big" disabled={state === 'sending'}>
            {state === 'sending' ? t('contact.sending') : t('contact.send')}
          </button>
          <p className="hint">
            {t('contact.privacyNote')} <Link to="/privacy">{t('contact.privacyLink')}</Link>
          </p>
        </form>
      )}
      <SiteFooter />
    </main>
  );
}
