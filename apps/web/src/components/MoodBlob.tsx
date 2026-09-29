import { MOOD_COLOR, MOOD_FACE, type Mood } from '@ziklub/zu';
import type { CSSProperties } from 'react';
import { SvgNodes } from './SvgNodes';

/** A mood Zu. Its shape animation comes from CSS (.mood-<name>); `still` turns it off. */
export function MoodBlob({ mood, size = 48, still = false }: { mood: Mood; size?: number; still?: boolean }) {
  return (
    <span className={`mood-blob mood-${mood}${still ? ' still' : ''}`} style={{ '--s': `${size}px`, '--c': MOOD_COLOR[mood] } as CSSProperties}>
      <svg viewBox="0 0 40 28" className="mood-face" aria-hidden="true" overflow="visible">
        {mood === 'fire' ? (
          <>
            <g className="calm">
              <SvgNodes nodes={MOOD_FACE.fire} />
            </g>
            <g className="lit">
              <SvgNodes nodes={MOOD_FACE.fireLit} />
            </g>
          </>
        ) : (
          <SvgNodes nodes={MOOD_FACE[mood]} />
        )}
      </svg>
    </span>
  );
}
