import { useEffect, useState } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Time in seconds, updated ~30 times a second while `active`. Used to make Zu bodies wobble. */
export function usePhase(active: boolean): number {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion()) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (t: number) => {
      if (t - last > 33) {
        last = t;
        setPhase((t - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return phase;
}
