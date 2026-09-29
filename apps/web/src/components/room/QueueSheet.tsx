import type { Member, SongRequest, Track } from '@ziklub/core';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../lib/audio';
import { IconClose, IconDown, IconPlus, IconTrash, IconUp } from '../Icons';
import { Sheet } from '../Sheet';

export interface Upload {
  id: number;
  name: string;
  progress: number;
}

interface Props {
  queue: Track[];
  currentId: string | null;
  members: Map<string, Member>;
  isDj: boolean;
  uid: string;
  uploads: Upload[];
  /** DJ: every pending suggestion. Others: their own. */
  requests: SongRequest[];
  onAddFiles: (files: FileList) => void;
  onPlay: (t: Track) => void;
  onRemove: (t: Track) => void;
  onMove: (t: Track, dir: -1 | 1) => void;
  onApprove: (r: SongRequest) => void;
  onDecline: (r: SongRequest) => void;
  onCancel: (r: SongRequest) => void;
  onClose: () => void;
}

export function QueueSheet(p: Props) {
  const { queue, currentId, members, isDj, uploads, requests } = p;
  const { t } = useTranslation();
  const whoAdded = (tr: Track) => members.get(tr.addedBy)?.name ?? tr.addedByName ?? '…';

  return (
    <Sheet title={t('room.queue')} onClose={p.onClose}>
      <div className="add-block">
        <label className={`btn ${isDj ? 'btn-primary' : 'btn-soft'} add-songs`}>
          <IconPlus /> {isDj ? t('room.addSongs') : t('room.suggestSongs')}
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) p.onAddFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {!isDj && <p className="hint">{t('room.suggestHint')}</p>}
      </div>

      {uploads.map((u) => (
        <div key={u.id} className="upload-row">
          <span>{t('room.uploading', { title: u.name })}</span>
          <div className="rail">
            <div className="fill" style={{ width: `${Math.round(u.progress * 100)}%` }} />
          </div>
        </div>
      ))}

      {requests.length > 0 && (
        <section className="requests" aria-label={isDj ? t('room.suggestions') : t('room.mySuggestions')}>
          <h3>
            {isDj ? t('room.suggestions') : t('room.mySuggestions')} <span className="count">{requests.length}</span>
          </h3>
          <ul className="queue-list">
            {requests.map((r) => (
              <li key={r.id} className="request">
                <span className="queue-text">
                  <b>{r.title}</b>
                  <small>
                    {formatTime(r.duration)} · {isDj ? t('room.suggestedBy', { name: r.addedByName }) : t('room.waitingDj')}
                  </small>
                </span>
                {isDj ? (
                  <span className="request-actions">
                    <button type="button" className="btn btn-primary btn-small" onClick={() => p.onApprove(r)}>
                      {t('room.approve')}
                    </button>
                    <button type="button" className="icon-btn" onClick={() => p.onDecline(r)} aria-label={`${t('room.decline')}: ${r.title}`}>
                      <IconClose size={18} />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => p.onCancel(r)}>
                    {t('room.cancel')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {queue.length === 0 && uploads.length === 0 && <p className="empty">{isDj ? t('room.emptyQueueDj') : t('room.emptyQueue')}</p>}

      <ol className="queue-list">
        {queue.map((tr, i) => {
          const current = tr.id === currentId;
          return (
            <li key={tr.id} className={current ? 'current' : undefined}>
              <button type="button" className="queue-item" disabled={!isDj} onClick={() => p.onPlay(tr)} aria-label={`${t('room.playThis')}: ${tr.title}`}>
                <span className="queue-num">{current ? '♪' : i + 1}</span>
                <span className="queue-text">
                  <b>{tr.title}</b>
                  <small>
                    {formatTime(tr.duration)} · {t('room.addedBy', { name: whoAdded(tr) })}
                  </small>
                </span>
              </button>
              {isDj && (
                <span className="row-actions">
                  <span className="move-btns">
                    <button type="button" className="move-btn" disabled={i === 0} onClick={() => p.onMove(tr, -1)} aria-label={`${t('room.moveUp')}: ${tr.title}`}>
                      <IconUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="move-btn"
                      disabled={i === queue.length - 1}
                      onClick={() => p.onMove(tr, 1)}
                      aria-label={`${t('room.moveDown')}: ${tr.title}`}
                    >
                      <IconDown size={16} />
                    </button>
                  </span>
                  <button type="button" className="icon-btn" onClick={() => p.onRemove(tr)} aria-label={`${t('room.remove')}: ${tr.title}`}>
                    <IconTrash size={18} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
