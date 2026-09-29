/**
 * Runs a background write without letting a failure become an uncaught error.
 * Used for writes where a refusal is harmless (e.g. a chat notice sent while briefly disconnected).
 */
export function quiet(p: Promise<unknown>): void {
  p.catch((e) => {
    if (import.meta.env.DEV) console.warn('[ziklub] background write failed:', e?.message ?? e);
  });
}
