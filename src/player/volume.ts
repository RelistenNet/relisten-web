/** The volume saved in localStorage (0–1), or `fallback` if none is saved or it's unreadable. */
export function savedVolume(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
  fallback = 1
): number {
  try {
    const raw = storage?.getItem('volume');
    if (raw === null || raw === undefined || raw.trim() === '') return fallback;
    const volume = Number(raw);
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback;
  } catch {
    return fallback;
  }
}
