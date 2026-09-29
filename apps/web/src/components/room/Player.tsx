import { expectedPosition, type Member, type Playback, type Track } from '@ziklub/core';
import { useEffect, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../lib/audio';
import { serverNow } from '../../lib/firebase';
import { IconNext, IconPause, IconPlay, IconPrev, IconQueue } from '../Icons';
import { MoodBlob } from '../MoodBlob';
import { ZuAvatar } from '../ZuAvatar';

interface Props {
  track: Track | null;
  playback: Playback | null;
  dj: Member | undefined;
  isDj: boolean;
  addedByName: string | undefined;
  queueCount: number;
  /** DJ only: suggestions waiting for approval. */
  pendingCount: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (s: number) => void;
  onOpenQueue: () => void;
}

export function Player({ track, playback, dj, isDj, addedByName, queueCount, pendingCount, onPlay, onPause, onNext, onPrevious, onSeek, onOpenQueue }: Props) {
  const { t } = useTranslation();
  const [pos, setPos] = useState(0);
  const playing = !!playback?.playing && !!track;
  const duration = track?.duration ?? 0;

  useEffect(() => {
    const update = () => setPos(playback ? Math.min(expectedPosition(playback, serverNow()), duration || Infinity) : 0);
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [playback, duration]);

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDj || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * duration);
  };

  const djTitle = isDj ? undefined : t('room.onlyDj');

  return (
    <section className="player" aria-label={t('room.nowPlaying')}>
      <div className="cover" aria-hidden="true">
        <MoodBlob mood={playing ? 'dance' : 'sleep'} size={34} />
      </div>
      <div className="track-info">
        <b className="track-title">{track?.title ?? t('room.nothingPlaying')}</b>
        {track && addedByName && <small>{t('room.addedBy', { name: addedByName })}</small>}
      </div>
      <button type="button" className="icon-btn queue-btn" onClick={onOpenQueue} aria-label={t('room.queue')}>
        <IconQueue />
        {pendingCount > 0 ? (
          <span className="badge badge-alert" aria-label={t('room.suggestions')}>
            {pendingCount}
          </span>
        ) : (
          queueCount > 0 && <span className="badge">{queueCount}</span>
        )}
      </button>

      <div className={`progress${isDj ? ' seekable' : ''}`}>
        <span>{formatTime(pos)}</span>
        <div className="rail" onClick={seek} role={isDj ? 'slider' : undefined} aria-valuenow={Math.round(pos)} aria-valuemin={0} aria-valuemax={Math.round(duration)}>
          <div className="fill" style={{ width: duration ? `${(pos / duration) * 100}%` : '0%' }} />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="controls">
        <span className="dj-label">
          {dj && <ZuAvatar look={dj.look} size={26} crop="head" />}
          <span>{isDj ? t('room.youAreDj') : dj ? t('room.isDj', { name: dj.name }) : ''}</span>
        </span>
        <div className="control-btns">
          <button type="button" className="icon-btn" onClick={onPrevious} disabled={!isDj} title={djTitle} aria-label={t('room.previous')}>
            <IconPrev />
          </button>
          <button
            type="button"
            className="icon-btn play-btn"
            onClick={playing ? onPause : onPlay}
            disabled={!isDj}
            title={djTitle}
            aria-label={playing ? t('room.pause') : t('room.play')}
          >
            {playing ? <IconPause size={22} /> : <IconPlay size={22} />}
          </button>
          <button type="button" className="icon-btn" onClick={onNext} disabled={!isDj} title={djTitle} aria-label={t('room.next')}>
            <IconNext />
          </button>
        </div>
      </div>
    </section>
  );
}
