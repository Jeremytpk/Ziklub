import { isMood, MOODS, type Mood } from '@ziklub/zu';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { MoodBlob } from '../MoodBlob';

export function ReactionBar({ onReact }: { onReact: (m: Mood) => void }) {
  const { t } = useTranslation();
  const last = useRef(0);
  return (
    <div className="reaction-bar" role="group" aria-label={t('room.react')}>
      {MOODS.map((m) => (
        <button
          key={m}
          type="button"
          className="reaction-btn"
          aria-label={t(`mood.${m}`)}
          title={t(`mood.${m}`)}
          onClick={() => {
            const now = Date.now();
            if (now - last.current < 120) return; // light spam guard
            last.current = now;
            onReact(m);
            navigator.vibrate?.(8);
          }}
        >
          <MoodBlob mood={m} size={28} still />
        </button>
      ))}
    </div>
  );
}

export interface FloatsHandle {
  add: (mood: string) => void;
}

interface Float {
  id: number;
  mood: Mood;
  left: number;
  dx: number;
}

/** Reactions rising over the chat, like live reactions on social apps. */
export const FloatingReactions = forwardRef<FloatsHandle>(function FloatingReactions(_, ref) {
  const [items, setItems] = useState<Float[]>([]);
  const next = useRef(0);

  const add = useCallback((mood: string) => {
    if (!isMood(mood)) return;
    const id = next.current++;
    setItems((cur) => [...cur.slice(-24), { id, mood, left: 6 + Math.random() * 72, dx: Math.random() * 60 - 30 }]);
    setTimeout(() => setItems((cur) => cur.filter((f) => f.id !== id)), 3200);
  }, []);

  useImperativeHandle(ref, () => ({ add }), [add]);

  return (
    <div className="floats" aria-hidden="true">
      {items.map((f) => (
        <span key={f.id} className="float" style={{ left: `${f.left}%`, '--dx': `${f.dx}px` } as CSSProperties}>
          <MoodBlob mood={f.mood} size={44} />
        </span>
      ))}
    </div>
  );
});
