/**
 * `window.localStorage`, or undefined when there's no window or the browser
 * refuses it. With site data blocked, reading the property itself throws a
 * SecurityError, so it has to be inside the try too.
 */
export function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Reads `key`, or null if storage is unavailable or the read throws. */
export function readStorage(key: string): string | null {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes `key`; best-effort, so quota and blocked storage are ignored. */
export function writeStorage(key: string, value: string): void {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Best-effort.
  }
}
