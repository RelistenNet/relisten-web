'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, re-rendering every `intervalMs`. Starts at `initial` (pass
 * the server's render time) so the first client render matches the HTML.
 */
export function useNow(intervalMs: number, initial: number) {
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
