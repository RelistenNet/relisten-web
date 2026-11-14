'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Whether the page is embedded in an iframe. Read in the browser: the
 * `sec-fetch-dest` request header says `iframe` only on the document request
 * and `empty` on every client navigation's fetch, so the server cannot tell
 * after the first page. The server renders as not embedded.
 */
export function useIsInIframe(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.self !== window.top,
    () => false
  );
}
