import { isValidRoomCode, normalizeRoomCode } from '@ziklub/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { LangToggle } from '../components/LangToggle';
import { LogoMark } from '../components/Logo';
import { ProfileEditor } from '../components/ProfileEditor';
import { ZuAvatar } from '../components/ZuAvatar';
import { engine } from '../lib/audio';
import { api, useAuthUser } from '../lib/firebase';
import { loadProfile, newProfile, saveProfile, type Profile } from '../lib/profile';
import { Room } from './Room';

type Step = 'loading' | 'missing' | 'profile' | 'room';

/** /r/:code — checks the room, asks for a name + Zu, then a tap to unlock sound, then shows the room. */
export function RoomPage() {
  const { t } = useTranslation();
  const code = normalizeRoomCode(useParams().code ?? '');
  const { user } = useAuthUser();
  const [step, setStep] = useState<Step>('loading');
  const [saved, setSaved] = useState<Profile | null>(() => loadProfile());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isValidRoomCode(code)) {
      setStep('missing');
      return;
    }
    let alive = true;
    api
      .roomExists(code)
      .then((ok) => alive && setStep(ok ? 'profile' : 'missing'))
      .catch(() => alive && setStep('missing'));
    return () => {
      alive = false;
    };
  }, [user, code]);

  const enter = (p: Profile) => {
    // This runs inside the tap, which is what lets phones play sound later.
    void engine.unlock();
    saveProfile(p);
    setSaved(p);
    setStep('room');
  };

  if (step === 'room' && user && saved) {
    return (
      <Room
        code={code}
        uid={user.uid}
        profile={saved}
        onProfileChange={(p) => {
          saveProfile(p);
          setSaved(p);
        }}
      />
    );
  }

  return (
    <main className="gate">
      <header className="gate-top">
        <Link to="/" className="gate-logo" aria-label="Ziklub">
          <LogoMark size={40} />
        </Link>
        <span className="code-chip">{code}</span>
        <LangToggle />
      </header>

      {step === 'loading' && <p className="gate-msg">{t('gate.loading')}</p>}

      {step === 'missing' && (
        <div className="gate-msg">
          <p>{t('gate.notFound')}</p>
          <Link className="btn btn-primary" to="/">
            {t('gate.backHome')}
          </Link>
        </div>
      )}

      {step === 'profile' && saved && !editing && (
        <div className="welcome-back">
          <ZuAvatar look={saved.look} size={170} animated />
          <button type="button" className="btn btn-primary btn-big" onClick={() => enter(saved)}>
            {t('profile.joinAs', { name: saved.name })}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            {t('profile.edit')}
          </button>
        </div>
      )}

      {step === 'profile' && (!saved || editing) && (
        <>
          <div className="gate-head">
            <h1>{t('profile.title')}</h1>
            <p>{t('profile.subtitle')}</p>
          </div>
          <ProfileEditor initial={saved ?? newProfile()} submitLabel={t('profile.join')} onSubmit={enter} />
        </>
      )}
    </main>
  );
}
