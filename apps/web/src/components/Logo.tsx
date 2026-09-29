import { colors } from '@ziklub/brand';
import { blobPath } from '@ziklub/zu';
import { usePhase } from '../hooks/usePhase';

/** Logo C: a "z" inside a breathing Zu. */
export function LogoMark({ size = 48, animated = false }: { size?: number; animated?: boolean }) {
  const phase = usePhase(animated);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d={blobPath('round', phase * 1.4, 50, 50, 46)} fill={colors.brand} />
      <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight={800} fontFamily="Sniglet, 'Arial Rounded MT Bold', sans-serif" fill={colors.cream}>
        z
      </text>
    </svg>
  );
}

export function Logo({ size = 48, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <span className="logo" aria-label="Ziklub">
      <LogoMark size={size} animated={animated} />
      <span className="logo-name" style={{ fontSize: size * 0.72 }}>
        ziklub
      </span>
    </span>
  );
}
