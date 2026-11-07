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
  advanceTo,
  emptyQueue,
  playContext,
  type QueueContext,
  type QueueState,
} from './queue/model';

export type QueueMode = 'booting' | 'ready' | 'embed';

export type PlayerState = { mode: QueueMode; queue: QueueState };

export type PlayerEvent =
  /** The saved queue, read after hydration. Ignored if the page already started playback. */
  | { type: 'HYDRATE'; saved: QueueState | null }
  | { type: 'EMBED' }
  | { type: 'PLAY_CONTEXT'; ctx: QueueContext; startKey: string }
  /** Make an entry current: gapless moved on by itself, or the user picked one. */
  | { type: 'GOTO'; key: string };

export const initialPlayer: PlayerState = { mode: 'booting', queue: emptyQueue };

export function playerTransition(state: PlayerState, event: PlayerEvent): PlayerState {
  const withQueue = (queue: QueueState) => (queue === state.queue ? state : { ...state, queue });
  switch (event.type) {
    case 'HYDRATE': {
      if (state.mode !== 'booting') return state;
      const pageStarted = !!state.queue.current;
      return { mode: 'ready', queue: pageStarted || !event.saved ? state.queue : event.saved };
    }
    case 'EMBED':
      return state.mode === 'booting' ? { ...state, mode: 'embed' } : state;
    case 'PLAY_CONTEXT':
      return withQueue(playContext(state.queue, event.ctx, event.startKey));
    case 'GOTO':
      return withQueue(advanceTo(state.queue, event.key));
  }
}

export const playerLogic = fromTransition(playerTransition, initialPlayer);
