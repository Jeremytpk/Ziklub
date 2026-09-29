import { isEffect, MAX_UPLOAD_BYTES, type Effect, type Member, type SongRequest } from '@ziklub/core';
import type { Mood } from '@ziklub/zu';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { IconBack, IconShare, IconSound } from '../components/Icons';
import { ProfileEditor } from '../components/ProfileEditor';
import { ChatList, MessageForm } from '../components/room/Chat';
import { EffectFlash, FxSheet, type FlashHandle } from '../components/room/Effects';
import { MembersSheet } from '../components/room/MembersSheet';
import { Player } from '../components/room/Player';
import { QueueSheet, type Upload } from '../components/room/QueueSheet';
import { FloatingReactions, ReactionBar, type FloatsHandle } from '../components/room/Reactions';
import { Sheet } from '../components/Sheet';
import { ZuAvatar } from '../components/ZuAvatar';
import { useRoom } from '../hooks/useRoom';
import { audioType, readDuration, titleFromFile } from '../lib/audio';
import { api, serverNow } from '../lib/firebase';
import { playFx } from '../lib/fx';
import { quiet } from '../lib/quiet';
import type { Profile } from '../lib/profile';

type Panel = 'queue' | 'members' | 'look' | 'fx' | null;

export function Room({ code, uid, profile, onProfileChange }: { code: string; uid: string; profile: Profile; onProfileChange: (p: Profile) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, messages, requests, isDj, currentTrack, dj, soundBlocked, resumeSound } = useRoom(code, uid, profile);
  const [panel, setPanel] = useState<Panel>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const floats = useRef<FloatsHandle>(null);
  const flash = useRef<FlashHandle>(null);

  const members = useMemo(() => new Map<string, Member>(state.members.map((m) => [m.uid, m])), [state.members]);
  const djMember = state.meta ? members.get(state.meta.djUid) : undefined;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  // Suggestion notices: the DJ hears about new ones, the suggester hears whether theirs was added.
  const queueRef = useRef(state.queue);
  queueRef.current = state.queue;
  const cancelled = useRef(new Set<string>());
  const prevRequests = useRef<{ dj: boolean; byId: Map<string, SongRequest> } | null>(null);
  useEffect(() => {
    const byId = new Map(requests.map((r) => [r.id, r]));
    const prev = prevRequests.current;
    prevRequests.current = { dj: isDj, byId };
    if (!prev || prev.dj !== isDj) return; // first load, or the aux changed hands
    if (isDj) {
      const fresh = requests.filter((r) => !prev.byId.has(r.id) && r.addedBy !== uid);
      const last = fresh[fresh.length - 1];
      if (last) {
        showToast(t('room.newSuggestion', { name: last.addedByName, title: last.title }));
        navigator.vibrate?.(20);
      }
      return;
    }
    for (const [id, r] of prev.byId) {
      if (byId.has(id) || cancelled.current.delete(id)) continue;
      // Approval moves it to the queue in the same write; give the queue update a moment to arrive.
      setTimeout(() => {
        const added = queueRef.current.some((q) => q.id === id);
        showToast(t(added ? 'room.suggestionApproved' : 'room.suggestionDeclined', { title: r.title }));
      }, 400);
    }
  }, [requests, isDj, uid, showToast, t]);

  // Reactions from everyone (including me) float over the chat.
  useEffect(() => api.subscribeReactions(code, serverNow(), (r) => floats.current?.add(r.mood)), [code]);

  // DJ effects: everyone hears and sees them. The DJ plays their own instantly, not via the database.
  const nameOf = useRef((id: string) => members.get(id)?.name ?? '');
  nameOf.current = (id: string) => members.get(id)?.name ?? '';
  useEffect(
    () =>
      api.subscribeEffects(code, serverNow(), (e) => {
        if (e.uid === uid || !isEffect(e.fx)) return;
        playFx(e.fx);
        flash.current?.show(e.fx, nameOf.current(e.uid));
      }),
    [code, uid],
  );
  const fireFx = (fx: Effect) => {
    playFx(fx);
    flash.current?.show(fx, profile.name);
    quiet(api.sendEffect(code, uid, fx));
  };

  const react = (m: Mood) => quiet(api.sendReaction(code, uid, m));
  const send = (text: string) => quiet(api.sendMessage(code, uid, profile.name, text));

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
        const asRequest = !isDj;
        const track = await api.addTrack(code, uid, file, { title, duration, contentType: type, addedByName: profile.name, asRequest }, (p) =>
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        );
        if (asRequest) showToast(t('room.suggestionSent', { title }));
        else dj.startIfIdle(track);
      } catch {
        showToast(t('room.uploadFailed', { name: file.name }));
      } finally {
        setUploads((u) => u.filter((x) => x.id !== id));
      }
    }
  };

  const passAux = async (m: Member) => {
    setPanel(null);
    try {
      await api.passAux(code, m.uid);
      quiet(api.sendSystem(code, uid, 'aux', { from: profile.name, to: m.name }));
    } catch {
      showToast(t('home.error'));
    }
  };

  const saveLook = async (p: Profile) => {
    onProfileChange(p);
    setPanel(null);
    try {
      await api.updateProfile(code, uid, { name: p.name, look: { ...p.look } });
      quiet(api.sendSystem(code, uid, 'look', { name: p.name }));
    } catch {
      showToast(t('home.error'));
    }
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
        addedByName={currentTrack ? (members.get(currentTrack.addedBy)?.name ?? currentTrack.addedByName) : undefined}
        queueCount={state.queue.length}
        pendingCount={isDj ? requests.length : 0}
        onPlay={dj.play}
        onPause={dj.pause}
        onNext={dj.next}
        onPrevious={dj.previous}
        onSeek={dj.seek}
        onOpenQueue={() => setPanel('queue')}
        onOpenFx={() => setPanel('fx')}
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

      <EffectFlash ref={flash} />

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
          requests={requests}
          uid={uid}
          onAddFiles={addFiles}
          onApprove={(r) => void dj.approve(r).catch(() => showToast(t('home.error')))}
          onDecline={(r) => quiet(dj.decline(r))}
          onCancel={(r) => {
            cancelled.current.add(r.id);
            quiet(api.removeRequest(code, r));
          }}
          onPlay={(tr) => dj.playTrack(tr)}
          onRemove={(tr) => quiet(dj.removeTrack(tr))}
          onMove={(tr, dir) => dj.move(tr, dir)}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'fx' && isDj && <FxSheet onFire={fireFx} onClose={() => setPanel(null)} />}
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
