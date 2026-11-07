// ---------------------------------------------------------------------------
// The player machine: the queue's state, and its lifecycle.
//
//   booting    Before the saved queue is read (it's read after hydration, so
//              the first client render matches the server's). A page can
//              already start playback here; nothing is saved yet.
//   ready      Restored. Changes are saved.
//   ephemeral  Embeds: one show, no Next up, nothing saved or restored.
//
// Queue edits are handled in every state and call the pure functions in
// queue/model.ts. The machine has no side effects: the engine subscribes to it
// and makes gapless match, and storage subscribes and saves.
// ---------------------------------------------------------------------------

import { assign, setup } from 'xstate';
import {
  addToQueue,
  advanceTo,
  emptyQueue,
  jumpTo,
  move,
  playContext,
  playNext,
  remove,
  restoreOnto,
  setRepeat,
  setShuffle,
  type QueueContext,
  type QueueItem,
  type QueueState,
  type RepeatMode,
} from './queue/model';

export type PlayerEvent =
  | { type: 'HYDRATE'; saved: QueueState | null }
  | { type: 'EMBED' }
  | { type: 'PLAY_CONTEXT'; ctx: QueueContext; startKey: string; seed?: number }
  | { type: 'PLAY_NEXT'; items: QueueItem[] }
  | { type: 'ADD_TO_QUEUE'; items: QueueItem[] }
  | { type: 'MOVE'; key: string; after: string }
  | { type: 'REMOVE'; key: string }
  | { type: 'JUMP_TO'; key: string }
  | { type: 'ADVANCED'; key: string }
  | { type: 'SET_SHUFFLE'; seed: number | null }
  | { type: 'SET_REPEAT'; repeat: RepeatMode };

export type PlayerContext = { queue: QueueState };

/**
 * Apply a model operation. The model throws on programmer errors (a duplicate
 * key); a throw inside an xstate action would stop the actor, so log and keep
 * the queue as it was.
 */
const apply =
  (op: (queue: QueueState, event: PlayerEvent) => QueueState) =>
  ({ context, event }: { context: PlayerContext; event: PlayerEvent }) => {
    try {
      return op(context.queue, event);
    } catch (error) {
      console.error('[player]', event.type, error);
      return context.queue;
    }
  };

const edit = (op: (queue: QueueState, event: PlayerEvent) => QueueState) =>
  assign<PlayerContext, PlayerEvent, undefined, PlayerEvent, never>({ queue: apply(op) });

export const playerMachine = setup({
  types: {
    context: {} as PlayerContext,
    events: {} as PlayerEvent,
  },
  actions: {
    playContext: edit((q, e) => {
      const { ctx, startKey, seed } = e as Extract<PlayerEvent, { type: 'PLAY_CONTEXT' }>;
      return playContext(q, ctx, startKey, { seed });
    }),
    playNext: edit((q, e) => playNext(q, (e as Extract<PlayerEvent, { type: 'PLAY_NEXT' }>).items)),
    addToQueue: edit((q, e) =>
      addToQueue(q, (e as Extract<PlayerEvent, { type: 'ADD_TO_QUEUE' }>).items)
    ),
    move: edit((q, e) => {
      const { key, after } = e as Extract<PlayerEvent, { type: 'MOVE' }>;
      return move(q, key, { after });
    }),
    remove: edit((q, e) => remove(q, (e as Extract<PlayerEvent, { type: 'REMOVE' }>).key)),
    jumpTo: edit((q, e) => jumpTo(q, (e as Extract<PlayerEvent, { type: 'JUMP_TO' }>).key)),
    advanced: edit((q, e) => advanceTo(q, (e as Extract<PlayerEvent, { type: 'ADVANCED' }>).key)),
    setShuffle: edit((q, e) =>
      setShuffle(q, (e as Extract<PlayerEvent, { type: 'SET_SHUFFLE' }>).seed)
    ),
    setRepeat: edit((q, e) =>
      setRepeat(q, (e as Extract<PlayerEvent, { type: 'SET_REPEAT' }>).repeat)
    ),
    hydrate: edit((q, e) => {
      const { saved } = e as Extract<PlayerEvent, { type: 'HYDRATE' }>;
      return saved ? restoreOnto(q, saved) : q;
    }),
  },
}).createMachine({
  id: 'player',
  initial: 'booting',
  context: { queue: emptyQueue },

  // Edits every state handles.
  on: {
    PLAY_CONTEXT: { actions: 'playContext' },
    MOVE: { actions: 'move' },
    REMOVE: { actions: 'remove' },
    JUMP_TO: { actions: 'jumpTo' },
    ADVANCED: { actions: 'advanced' },
    SET_REPEAT: { actions: 'setRepeat' },
  },

  states: {
    booting: {
      on: {
        HYDRATE: { target: 'ready', actions: 'hydrate' },
        EMBED: { target: 'ephemeral' },
        PLAY_NEXT: { actions: 'playNext' },
        ADD_TO_QUEUE: { actions: 'addToQueue' },
        SET_SHUFFLE: { actions: 'setShuffle' },
      },
    },
    ready: {
      on: {
        PLAY_NEXT: { actions: 'playNext' },
        ADD_TO_QUEUE: { actions: 'addToQueue' },
        SET_SHUFFLE: { actions: 'setShuffle' },
      },
    },
    // Embeds play one show: no Next up, no shuffle, nothing saved.
    ephemeral: {},
  },
});
