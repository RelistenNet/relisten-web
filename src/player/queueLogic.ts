// ---------------------------------------------------------------------------
// The queue's state in the app: the model's queue, and whether it's saved.
//
//   booting  Before the saved queue is read (it's read after hydration, so
//            the first client render matches the server's). A page can
//            already start playback here; nothing is saved yet.
//   ready    Restored. Changes are saved.
//   embed    One show; nothing saved or restored.
//
// A pure reducer: the engine subscribes and makes gapless match, and storage
// subscribes and saves (runtime.ts).
// ---------------------------------------------------------------------------

import { fromTransition } from 'xstate';
import {
  addToQueue,
  advanceTo,
  emptyQueue,
  move,
  playContext,
  playNext,
  remove,
  type QueueItem,
  type QueueContext,
  type QueueState,
} from './queue/model';

export type QueueMode = 'booting' | 'ready' | 'embed';

export type PlayerState = { mode: QueueMode; queue: QueueState };

export type PlayerEvent =
  /** The saved queue, read after hydration. Ignored if the page started another track (see restores). */
  | { type: 'HYDRATE'; saved: QueueState | null }
  | { type: 'EMBED' }
  | { type: 'PLAY_CONTEXT'; ctx: QueueContext; startKey: string }
  /** Make an entry current: gapless moved on by itself, or the user picked one. */
  | { type: 'GOTO'; key: string }
  /** Next up (the queue panel and row menus). Ignored in embeds. */
  | { type: 'PLAY_NEXT'; items: QueueItem[] }
  | { type: 'ADD_TO_QUEUE'; items: QueueItem[] }
  | { type: 'MOVE'; key: string; after: string | null }
  | { type: 'REMOVE'; key: string };

export const initialPlayer: PlayerState = { mode: 'booting', queue: emptyQueue };

/**
 * Whether hydrating takes the saved queue over what the page started while
 * booting: when the page started nothing, or started the saved current track
 * (a reload of a track page: the URL follows playback, so it names that track).
 */
export function restores(page: QueueState, saved: QueueState | null): saved is QueueState {
  if (!saved) return false;
  const started = page.current?.item;
  if (!started) return true;
  const was = saved.current?.item;
  return !!was && was.trackId === started.trackId && was.sourceId === started.sourceId;
}

export function playerTransition(state: PlayerState, event: PlayerEvent): PlayerState {
  const withQueue = (queue: QueueState) => (queue === state.queue ? state : { ...state, queue });
  switch (event.type) {
    case 'HYDRATE': {
      if (state.mode !== 'booting') return state;
      return {
        mode: 'ready',
        queue: restores(state.queue, event.saved) ? event.saved : state.queue,
      };
    }
    case 'EMBED':
      return state.mode === 'booting' ? { ...state, mode: 'embed' } : state;
    case 'PLAY_CONTEXT':
      return withQueue(playContext(state.queue, event.ctx, event.startKey));
    case 'GOTO':
      return withQueue(advanceTo(state.queue, event.key));
    case 'PLAY_NEXT':
      return state.mode === 'embed' ? state : withQueue(playNext(state.queue, event.items));
    case 'ADD_TO_QUEUE':
      return state.mode === 'embed' ? state : withQueue(addToQueue(state.queue, event.items));
    case 'MOVE':
      return withQueue(move(state.queue, event.key, event.after));
    case 'REMOVE':
      return withQueue(remove(state.queue, event.key));
    default:
      // Events from outside the app's types (devtools, an older client) mustn't wipe the state.
      return state;
  }
}

export const playerLogic = fromTransition(playerTransition, initialPlayer);
