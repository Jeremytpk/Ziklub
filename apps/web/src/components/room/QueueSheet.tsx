import type { Member, Track } from '@ziklub/core';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../lib/audio';
import { IconPlus, IconTrash } from '../Icons';
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
  uploads: Upload[];
  onAddFiles: (files: FileList) => void;
  onPlay: (t: Track) => void;
  onRemove: (t: Track) => void;
  onClose: () => void;
}

export function QueueSheet({ queue, currentId, members, isDj, uploads, onAddFiles, onPlay, onRemove, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Sheet title={t('room.queue')} onClose={onClose}>
      {isDj && (
        <label className="btn btn-primary add-songs">
          <IconPlus /> {t('room.addSongs')}
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) onAddFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}

      {uploads.map((u) => (
        <div key={u.id} className="upload-row">
          <span>{t('room.uploading', { title: u.name })}</span>
          <div className="rail">
            <div className="fill" style={{ width: `${Math.round(u.progress * 100)}%` }} />
          </div>
        </div>
      ))}

      {queue.length === 0 && uploads.length === 0 && <p className="empty">{isDj ? t('room.emptyQueueDj') : t('room.emptyQueue')}</p>}

      <ol className="queue-list">
        {queue.map((tr, i) => {
          const current = tr.id === currentId;
          return (
            <li key={tr.id} className={current ? 'current' : undefined}>
              <button type="button" className="queue-item" disabled={!isDj} onClick={() => onPlay(tr)} aria-label={`${t('room.playThis')}: ${tr.title}`}>
                <span className="queue-num">{current ? '♪' : i + 1}</span>
                <span className="queue-text">
                  <b>{tr.title}</b>
                  <small>
                    {formatTime(tr.duration)} · {t('room.addedBy', { name: members.get(tr.addedBy)?.name ?? '…' })}
                  </small>
                </span>
              </button>
              {isDj && (
                <button type="button" className="icon-btn" onClick={() => onRemove(tr)} aria-label={`${t('room.remove')}: ${tr.title}`}>
                  <IconTrash size={18} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
