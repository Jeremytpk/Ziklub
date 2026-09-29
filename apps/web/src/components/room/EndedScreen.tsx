import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import type { RoomEnd } from '../../hooks/useRoom';
import { MoodBlob } from '../MoodBlob';

/** Replaces the room once it is closed, has reached 3 hours, or was erased. */
export function EndedScreen({ end }: { end: RoomEnd }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const title =
    end.reason === 'closed'
      ? end.byMe
        ? t('ended.closedByMe')
        : t('ended.closedBy', { name: end.by })
      : end.reason === 'expired'
        ? t('ended.expired')
        : t('ended.gone');
  return (
    <main className="ended" role="alertdialog" aria-labelledby="ended-title">
      <MoodBlob mood="sleep" size={120} />
      <h1 id="ended-title">{title}</h1>
      <p>{end.reason === 'expired' ? t('ended.expiredHint') : t('ended.erased')}</p>
      <div className="ended-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={() => navigate('/?create=1')}>
          {t('ended.newRoom')}
        </button>
        <Link to="/" className="btn btn-ghost">
          {t('ended.home')}
        </Link>
      </div>
    </main>
  );
}
