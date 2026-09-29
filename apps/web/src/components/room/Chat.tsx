import type { Member, Message } from '@ziklub/core';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { IconSend } from '../Icons';
import { ZuAvatar } from '../ZuAvatar';

export function ChatList({ messages, members, uid }: { messages: Message[]; members: Map<string, Member>; uid: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Follow new messages, unless the user scrolled up to read older ones.
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      className="chat-list"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
      aria-live="polite"
    >
      {messages.map((m) =>
        m.kind === 'system' ? (
          <div key={m.id} className="msg-sys">
            <span>{t(`sys.${m.event}`, m.params ?? {})}</span>
          </div>
        ) : (
          <div key={m.id} className={`msg${m.uid === uid ? ' mine' : ''}`}>
            {m.uid !== uid && <ZuAvatar look={members.get(m.uid)?.look} size={30} crop="head" className="msg-avatar" />}
            <div className="bubble">
              {m.uid !== uid && <small>{m.name}</small>}
              {m.text}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function MessageForm({ onSend }: { onSend: (text: string) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };
  return (
    <form className="msg-form" onSubmit={submit}>
      <input
        id="chat-input"
        className="input"
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('room.typeMessage')}
        enterKeyHint="send"
        autoComplete="off"
      />
      <button type="submit" className="send-btn" aria-label={t('room.send')} disabled={!text.trim()}>
        <IconSend />
      </button>
    </form>
  );
}
