import { BODY, blobPath, buildZu, sanitizeLook } from '@ziklub/zu';
import { useId, useMemo } from 'react';
import { usePhase } from '../hooks/usePhase';
import { SvgNodes } from './SvgNodes';

interface Props {
  /** Any look object; invalid values fall back to defaults. */
  look: unknown;
  /** Width in px. */
  size?: number;
  animated?: boolean;
  /** 'head' crops to a square around the face, for small avatars. */
  crop?: 'full' | 'head';
  /** Show the DJ crown. */
  crown?: boolean;
  className?: string;
}

export function ZuAvatar({ look, size = 120, animated = false, crop = 'full', crown = false, className }: Props) {
  const id = 'zu' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const l = useMemo(() => sanitizeLook(look), [look]);
  const drawing = useMemo(() => buildZu(l, id, { crown }), [l, id, crown]);
  const phase = usePhase(animated);
  const head = crop === 'head';
  return (
    <svg
      className={className}
      viewBox={head ? '4 14 152 152' : '0 0 160 188'}
      width={size}
      height={head ? size : (size * 188) / 160}
      style={{ overflow: head ? 'hidden' : 'visible' }}
      aria-hidden="true"
    >
      <SvgNodes nodes={drawing.back} />
      <path d={blobPath(l.shape, phase)} fill={BODY[l.body]} />
      <ellipse cx="54" cy="62" rx="15" ry="9" fill="#FFFFFF" opacity="0.28" transform="rotate(-32 54 62)" />
      <SvgNodes nodes={drawing.front} />
    </svg>
  );
}
