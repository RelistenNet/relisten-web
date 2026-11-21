import { useSyncExternalStore } from 'react';
import type { DraftState, DraftStore } from './store';

/**
 * A draft's state, for rendering. The server render has no draft edits yet, so
 * it reads the same state the store starts with.
 */
export function useDraft(store: DraftStore): DraftState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
