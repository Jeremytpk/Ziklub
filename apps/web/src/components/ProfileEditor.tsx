import { randomLook } from '@ziklub/zu';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cleanName, type Profile } from '../lib/profile';
import { ZuAvatar } from './ZuAvatar';
import { ZuBuilder } from './ZuBuilder';

/** Name + Zu builder with a live preview. `submitLabel` is the main button (e.g. "Join the party"). */
export function ProfileEditor({ initial, submitLabel, onSubmit }: { initial: Profile; submitLabel: string; onSubmit: (p: Profile) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [look, setLook] = useState(initial.look);
  const [error, setError] = useState(false);
  const [pop, setPop] = useState(0);

  const change = (l: typeof look) => {
    setLook(l);
    setPop((n) => n + 1);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = cleanName(name);
    if (!n) {
      setError(true);
      return;
    }
    onSubmit({ name: n, look });
  };

  return (
    <form className="profile-editor" onSubmit={submit}>
      <div className="preview">
        <div key={pop} className="preview-zu pop">
          <ZuAvatar look={look} size={150} animated />
        </div>
        <div className="preview-name">{cleanName(name) || t('profile.namePlaceholder')}</div>
        <button type="button" className="btn btn-soft" onClick={() => change(randomLook())}>
          {t('profile.surprise')}
        </button>
      </div>
      <div className="editor-controls">
        <label className="field">
          <span className="field-label">{t('profile.name')}</span>
          <input
            id="profile-name"
            className="input"
            value={name}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t('profile.namePlaceholder')}
            onChange={(e) => {
              setName(e.target.value);
              setError(false);
            }}
            aria-invalid={error}
          />
          {error && <span className="field-error">{t('profile.nameMissing')}</span>}
        </label>
        <ZuBuilder look={look} onChange={change} />
        <button type="submit" className="btn btn-primary btn-big">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
