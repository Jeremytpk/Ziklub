import { MAX_UPLOAD_BYTES, type Member } from '@ziklub/core';
import type { Mood } from '@ziklub/zu';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { IconBack, IconShare, IconSound } from '../components/Icons';
import { ProfileEditor } from '../components/ProfileEditor';
import { ChatList, MessageForm } from '../components/room/Chat';
import { MembersSheet } from '../components/room/MembersSheet';
import { Player } from '../components/room/Player';
import { QueueSheet, type Upload } from '../components/room/QueueSheet';
import { FloatingReactions, ReactionBar, type FloatsHandle } from '../components/room/Reactions';
import { Sheet } from '../components/Sheet';
import { ZuAvatar } from '../components/ZuAvatar';
import { useRoom } from '../hooks/useRoom';
import { audioType, readDuration, titleFromFile } from '../lib/audio';
import { api, serverNow } from '../lib/firebase';
import type { Profile } from '../lib/profile';

type Panel = 'queue' | 'members' | 'look' | null;

export function Room({ code, uid, profile, onProfileChange }: { code: string; uid: string; profile: Profile; onProfileChange: (p: Profile) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, messages, isDj, currentTrack, dj, soundBlocked, resumeSound } = useRoom(code, uid, profile);
  const [panel, setPanel] = useState<Panel>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const floats = useRef<FloatsHandle>(null);

  const members = useMemo(() => new Map<string, Member>(state.members.map((m) => [m.uid, m])), [state.members]);
  const djMember = state.meta ? members.get(state.meta.djUid) : undefined;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  // Reactions from everyone (including me) float over the chat.
  useEffect(() => api.subscribeReactions(code, serverNow(), (r) => floats.current?.add(r.mood)), [code]);

  const react = (m: Mood) => void api.sendReaction(code, uid, m);
  const send = (text: string) => void api.sendMessage(code, uid, profile.name, text);

  const share = async () => {
    const url = `${window.location.origin}/r/${code}`;
    const text = t('room.shareText', { code });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Ziklub', text, url });
        return;
      }
    } catch {
      return; // user closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('room.copied'));
    } catch {
      showToast(url);
    }
  };

  const addFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const type = audioType(file);
      if (!type) {
        showToast(t('room.notAudio', { name: file.name }));
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast(t('room.fileTooBig', { name: file.name }));
        continue;
      }
      const id = Date.now() + Math.random();
      const title = titleFromFile(file.name);
      setUploads((u) => [...u, { id, name: title, progress: 0 }]);
      try {
        const duration = await readDuration(file);
        const track = await api.addTrack(code, uid, file, { title, duration, contentType: type }, (p) =>
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        );
        dj.startIfIdle(track);
      } catch {
        showToast(t('room.uploadFailed', { name: file.name }));
      } finally {
        setUploads((u) => u.filter((x) => x.id !== id));
      }
    }
  };

  const passAux = async (m: Member) => {
    await api.passAux(code, m.uid);
    await api.sendSystem(code, uid, 'aux', { from: profile.name, to: m.name });
    setPanel(null);
  };

  const saveLook = async (p: Profile) => {
    onProfileChange(p);
    setPanel(null);
    await api.updateProfile(code, uid, { name: p.name, look: { ...p.look } });
    await api.sendSystem(code, uid, 'look', { name: p.name });
  };

  return (
    <div className="room">
      <header className="room-top">
        <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label={t('room.leave')}>
          <IconBack />
        </button>
        <button type="button" className="code-chip" onClick={share} aria-label={t('room.share')}>
          {code} <IconShare size={16} />
        </button>
        <button type="button" className="member-stack" onClick={() => setPanel('members')} aria-label={t('room.members')}>
          {state.members.slice(0, 4).map((m) => (
            <ZuAvatar key={m.uid} look={m.look} size={30} crop="head" />
          ))}
          <span>{t('room.listening', { count: state.members.length })}</span>
        </button>
      </header>

      <Player
        track={currentTrack}
        playback={state.playback}
        dj={djMember}
        isDj={isDj}
        addedByName={currentTrack ? members.get(currentTrack.addedBy)?.name : undefined}
        queueCount={state.queue.length}
        onPlay={dj.play}
        onPause={dj.pause}
        onNext={dj.next}
        onPrevious={dj.previous}
        onSeek={dj.seek}
        onOpenQueue={() => setPanel('queue')}
      />

      <div className="chat-area">
        <ChatList messages={messages} members={members} uid={uid} />
        <FloatingReactions ref={floats} />
        {soundBlocked && (
          <button type="button" className="sound-banner" onClick={resumeSound}>
            <IconSound /> {t('room.tapForSound')}
          </button>
        )}
      </div>

      <footer className="room-bottom">
        <ReactionBar onReact={react} />
        <MessageForm onSend={send} />
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {panel === 'queue' && (
        <QueueSheet
          queue={state.queue}
          currentId={state.playback?.trackId ?? null}
          members={members}
          isDj={isDj}
          uploads={uploads}
          onAddFiles={addFiles}
          onPlay={(tr) => dj.playTrack(tr)}
          onRemove={(tr) => void dj.removeTrack(tr)}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'members' && (
        <MembersSheet
          members={state.members}
          djUid={state.meta?.djUid}
          uid={uid}
          isDj={isDj}
          onPassAux={passAux}
          onEditLook={() => setPanel('look')}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'look' && (
        <Sheet title={t('room.editLook')} onClose={() => setPanel(null)}>
          <ProfileEditor initial={profile} submitLabel={t('profile.save')} onSubmit={saveLook} />
        </Sheet>
      )}
    </div>
  );
}
