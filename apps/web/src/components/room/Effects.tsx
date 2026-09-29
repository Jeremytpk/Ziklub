import { EFFECTS, isEffect, type Effect } from '@ziklub/core';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../Sheet';

/** Pad colour for each effect (brand mood colours). */
export const FX_COLOR: Record<Effect, string> = {
  airhorn: 'var(--coral)',
  rewind: 'var(--sky)',
  scratch: 'var(--lav)',
  drop: 'var(--brand)',
  siren: 'var(--pink)',
  crowd: 'var(--butter)',
  laser: 'var(--mint)',
  drumroll: 'var(--peach)',
};

/** The DJ's effect pads. Stays open so the DJ can fire several in a row. */
export function FxSheet({ onFire, onClose }: { onFire: (fx: Effect) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const last = useRef(0);
  return (
    <Sheet title={t('room.fx')} onClose={onClose}>
      <p className="hint">{t('room.fxHint')}</p>
      <div className="fx-pads">
        {EFFECTS.map((fx) => (
          <button
            key={fx}
            type="button"
            className={`fx-pad fx-${fx}`}
            style={{ '--c': FX_COLOR[fx] } as CSSProperties}
            onClick={() => {
              const now = Date.now();
              if (now - last.current < 300) return; // no machine-gun spam
              last.current = now;
              navigator.vibrate?.(15);
              onFire(fx);
            }}
          >
            {t(`fx.${fx}`)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export interface FlashHandle {
  show: (fx: string, by: string) => void;
}

/** Big burst on everyone's screen when the DJ fires an effect. */
export const EffectFlash = forwardRef<FlashHandle>(function EffectFlash(_, ref) {
  const { t } = useTranslation();
  const [flash, setFlash] = useState<{ key: number; fx: Effect; by: string } | null>(null);
  const n = useRef(0);
  const show = useCallback((fx: string, by: string) => {
    if (!isEffect(fx)) return;
    const key = ++n.current;
    setFlash({ key, fx, by });
    setTimeout(() => setFlash((f) => (f?.key === key ? null : f)), 1400);
  }, []);
  useImperativeHandle(ref, () => ({ show }), [show]);
  if (!flash) return null;
  return (
    <div key={flash.key} className="fx-flash" style={{ '--c': FX_COLOR[flash.fx] } as CSSProperties} aria-live="polite">
      <div className="fx-burst" />
      <div className="fx-word">
        {t(`fx.${flash.fx}`)}
        <small>{flash.by}</small>
      </div>
    </div>
  );
});
