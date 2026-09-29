import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '@ziklub/core';
import { MOODS } from '@ziklub/zu';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LangToggle } from '../components/LangToggle';
import { LogoMark } from '../components/Logo';
import { MoodBlob } from '../components/MoodBlob';
import { api, useAuthUser } from '../lib/firebase';

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, error: authError } = useAuthUser();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(authError ? t('home.error') : null);

  const create = async () => {
    if (!user) return;
    setBusy('create');
    setError(null);
    try {
      const c = await api.createRoom(user.uid);
      navigate(`/r/${c}`);
    } catch {
      setError(t('home.error'));
      setBusy(null);
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeRoomCode(code);
    if (!isValidRoomCode(c) || !user) {
      setError(t('home.notFound'));
      return;
    }
    setBusy('join');
    setError(null);
    try {
      if (await api.roomExists(c)) navigate(`/r/${c}`);
      else {
        setError(t('home.notFound'));
        setBusy(null);
      }
    } catch {
      setError(t('home.error'));
      setBusy(null);
    }
  };

  return (
    <main className="home">
      <div className="home-top">
        <LangToggle />
      </div>
      <div className="home-hero">
        <LogoMark size={120} animated />
        <h1 className="wordmark">ziklub</h1>
        <p className="tagline">{t('app.tagline')}</p>
        <p className="home-intro">{t('home.intro')}</p>
      </div>
      <div className="home-moods" aria-hidden="true">
        {MOODS.map((m) => (
          <MoodBlob key={m} mood={m} size={34} />
        ))}
      </div>
      <div className="home-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={create} disabled={!user || busy !== null}>
          {busy === 'create' ? t('home.creating') : t('home.create')}
        </button>
        <p className="home-or">{t('home.or')}</p>
        <form className="join-form" onSubmit={join}>
          <label className="sr-only" htmlFor="room-code">
            {t('home.codeLabel')}
          </label>
          <input
            id="room-code"
            className="input code-input"
            value={code}
            onChange={(e) => {
              setCode(normalizeRoomCode(e.target.value));
              setError(null);
            }}
            placeholder={t('home.codePlaceholder')}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={ROOM_CODE_LENGTH}
            inputMode="text"
          />
          <button type="submit" className="btn btn-soft" disabled={!user || busy !== null || code.length < ROOM_CODE_LENGTH}>
            {t('home.join')}
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
