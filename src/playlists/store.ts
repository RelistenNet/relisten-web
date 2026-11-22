// A playlist being edited (docs/playlist-editing.md, "Decisions"). The editor
// shows `content`: what the server confirmed (`base`), with the edits not yet
// confirmed applied on top by the same applyOp the server mirrors.
//
// Saving is an xstate machine, so every state and its ways out are in one place:
//
//   idle ──edit──▶ sending ──saved──▶ idle (or sending again, if more is queued)
//                     │ ├──conflict──▶ rebasing ──▶ sending (replayed on the new base)
//                     │ └──refused (422)──▶ idle (the batch is dropped; `refused` says so)
//                     └──anything else──▶ failed ──retry or edit──▶ sending
//
// Edits address IDs, not positions, so a batch replayed after someone else's
// save still fits. One batch is in flight at a time; edits made meanwhile wait
// in `queue` and go next. Undo applies an edit's inverse as a new edit.

import {
  type ActorRefFrom,
  assign,
  createActor,
  fromPromise,
  setup,
  type SnapshotFrom,
} from 'xstate';
import {
  applyOp,
  inverse,
  type NewId,
  PlaylistOpError,
  remapIds,
  retargetOpLinks,
  retargetProse,
} from '@/domain/playlistOps';
import {
  type PlaylistBatchResponseWire,
  type PlaylistContent,
  type PlaylistOp,
  type PlaylistSnapshotWire,
  toPlaylistContent,
} from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';
import { PlaylistWriteError, type PlaylistTransport } from './transport';

export type DraftStatus = 'saved' | 'saving' | 'error';

/**
 * How a save ended, for whatever needs the server caught up with the screen
 * (Publish, leaving the editor): everything saved; it failed (kept, for Retry);
 * or the server refused some of it (reverted, its text reopened).
 */
export type Settled =
  | { kind: 'saved' }
  | { kind: 'failed'; error: PlaylistWriteError }
  | { kind: 'refused'; refusal: Refusal };

/**
 * Text that didn't make it, handed back: refused (422: as written, the server won't
 * take it), or skipped (its block went, in someone else's edit; the text itself
 * is fine). Why, and the operations.
 */
export type Refusal = { kind: 'refused' | 'skipped'; error: PlaylistWriteError; ops: PlaylistOp[] };

export type DraftState = {
  content: PlaylistContent;
  status: DraftStatus;
  /** Why the last save failed, while status is `error` (Retry sends it again). */
  error?: PlaylistWriteError;
  /**
   * The last batch the server refused, until the next edit: the editor says why
   * and reopens the text it came from. Nothing is left unsaved by it.
   */
  refused?: Refusal;
  canUndo: boolean;
};

export type DraftStore = {
  getState(): DraftState;
  subscribe(listener: () => void): () => void;
  /**
   * Applies edits now, in order, as one undo step, and sends them. Edits that
   * change nothing are left out. Throws PlaylistOpError, applying none of them,
   * for an edit the server would refuse outright (a text entry with no text, a
   * nameless playlist). Returns the ones it applied: one that changed nothing here
   * (its target or parent is gone) isn't among them.
   */
  edit(...ops: PlaylistOp[]): PlaylistOp[];
  undo(): void;
  /** Sends again what failed to save (Retry). */
  retry(): void;
  /**
   * Retries what's waiting and resolves once nothing is, with how it ended.
   * (Nothing needs stopping afterwards: once settled, the store holds no timers
   * or requests.)
   */
  settle(): Promise<Settled>;
};

/** Conflicts in a row before the store stops replaying and reports one. */
const MAX_CONFLICTS = 3;

/** An operation waiting to be sent, and which edit it's part of (ops of one edit go together). */
type Queued = { id: string; op: PlaylistOp; edit: number };

/** Whether an operation carries text the server could refuse (too long, bad Markdown). */
function carriesText(op: PlaylistOp): boolean {
  switch (op.operation_type) {
    case 'update_metadata':
    case 'update_segment':
    case 'update_entry':
      return true;
    case 'insert_segment':
      return !!op.payload.description || op.payload.entries.some((e) => !!e.description);
    case 'insert_entries':
      return op.payload.entries.some((e) => !!e.description);
    default:
      return false;
  }
}

/**
 * The next batch from the front of the queue: whole edits only. An edit with text
 * goes alone, so a refusal (the server refuses a batch whole) is always that one
 * edit's, and reopens just its field; edits without text go together.
 */
function nextBatch(queue: Queued[]): number {
  const edits: Queued[][] = [];
  for (const q of queue) {
    const last = edits.at(-1);
    if (last && last[0].edit === q.edit) last.push(q);
    else edits.push([q]);
  }
  const text = (edit: Queued[]) => edit.some((q) => carriesText(q.op));
  if (!edits.length) return 0;
  if (text(edits[0])) return edits[0].length;
  let n = 0;
  for (const edit of edits) {
    if (text(edit)) break;
    n += edit.length;
  }
  return n;
}
/** An edit's inverse, and the IDs it re-creates under new names (see `inverse`). */
type UndoStep = { ops: PlaylistOp[]; renamed: Record<string, string> };

type Context = {
  /** What the server has confirmed. */
  base: PlaylistContent;
  /** The batch being sent: only ever non-empty in `sending`. */
  inflight: Queued[];
  /** Edits waiting for the next batch. */
  queue: Queued[];
  undo: UndoStep[];
  conflicts: number;
  error?: PlaylistWriteError;
  refused?: Refusal;
};

type Event =
  | { type: 'EDIT'; ops: Queued[]; step: UndoStep }
  /** The top undo step's operations, already given their IDs. */
  | { type: 'UNDO'; ops: Queued[] }
  | { type: 'RETRY' };

const asWriteError = (err: unknown) =>
  err instanceof PlaylistWriteError ? err : new PlaylistWriteError('unavailable');

/**
 * Applies operations as the server would, skipping one it would refuse. (A
 * replay on someone else's newer playlist can meet one; the server refuses it
 * in turn, and the refusal reverts it.)
 */
function replay(content: PlaylistContent, items: readonly Queued[]): PlaylistContent {
  return items.reduce((c, { op }) => {
    try {
      return applyOp(c, op).content;
    } catch (err) {
      if (err instanceof PlaylistOpError) return c;
      throw err;
    }
  }, content);
}

function draftMachine(transport: PlaylistTransport) {
  /** Puts the batch back in front of the queue, to send again. */
  const requeue = ({ inflight, queue }: Context) => ({
    queue: [...inflight, ...queue],
    inflight: [],
  });

  return setup({
    types: {
      context: {} as Context,
      events: {} as Event,
      input: {} as PlaylistContent,
    },
    actors: {
      send: fromPromise<PlaylistBatchResponseWire, { base: PlaylistContent; ops: Queued[] }>(
        ({ input: { base, ops } }) =>
          transport.batch(
            base.playlistId,
            ops.map((q) => ({ ...q.op, operation_id: q.id, base_revision: base.revision })),
            base.revision
          )
      ),
      refetch: fromPromise<PlaylistSnapshotWire, { playlistId: string }>(({ input }) =>
        transport.snapshot(input.playlistId)
      ),
    },
    guards: {
      queued: ({ context }) => context.queue.length > 0,
      conflict: ({ context }, error: unknown) =>
        asWriteError(error).kind === 'conflict' && context.conflicts < MAX_CONFLICTS,
      refused: (_, error: unknown) => asWriteError(error).kind === 'invalid',
    },
    actions: {
      enqueue: assign(({ context, event }) =>
        event.type === 'EDIT'
          ? {
              queue: [...context.queue, ...event.ops],
              undo: [...context.undo, event.step],
              refused: undefined,
            }
          : {}
      ),
      enqueueUndo: assign(({ context, event }) => {
        const step = context.undo.at(-1);
        if (event.type !== 'UNDO' || !step) return {};
        return {
          // The undo re-creates things under new IDs: older steps follow them.
          undo: context.undo
            .slice(0, -1)
            .map((s) => ({ ...s, ops: s.ops.map((o) => remapIds(o, step.renamed)) })),
          queue: [...context.queue, ...event.ops],
          refused: undefined,
        };
      }),
      takeQueue: assign(({ context }) => {
        const n = nextBatch(context.queue);
        return {
          inflight: context.queue.slice(0, n),
          queue: context.queue.slice(n),
          error: undefined,
        };
      }),
      fail: assign(({ context }, error: unknown) => ({
        ...requeue(context),
        error: asWriteError(error),
        conflicts: 0,
      })),
    },
  }).createMachine({
    id: 'playlistDraft',
    context: ({ input }) => ({ base: input, inflight: [], queue: [], undo: [], conflicts: 0 }),
    initial: 'idle',
    on: {
      EDIT: { actions: 'enqueue' },
      UNDO: { actions: 'enqueueUndo' },
    },
    states: {
      idle: {
        always: { guard: 'queued', target: 'sending' },
      },
      sending: {
        entry: 'takeQueue',
        invoke: {
          src: 'send',
          input: ({ context }) => ({ base: context.base, ops: context.inflight }),
          onDone: {
            target: 'idle',
            actions: assign(({ context, event }) => {
              // Text the server skipped (its block went: someone else's edit, met on a
              // replay) didn't make it: like a refusal, it's handed back to reopen.
              const skipped = new Set(
                event.output.results
                  .filter((r) => r.status !== 'applied' && r.status !== 'no_op')
                  .map((r) => r.operation_id)
              );
              const lost = context.inflight.filter((q) => skipped.has(q.id) && carriesText(q.op));
              return {
                base: {
                  ...replay(context.base, context.inflight),
                  revision: event.output.head_revision,
                  generation: event.output.history_generation,
                },
                inflight: [],
                conflicts: 0,
                ...(lost.length && {
                  refused: {
                    kind: 'skipped',
                    error: new PlaylistWriteError(
                      'invalid',
                      'What you were writing in was removed elsewhere. Your text is kept.'
                    ),
                    ops: lost.map((q) => q.op),
                  },
                }),
              };
            }),
          },
          onError: [
            {
              // The batch wasn't applied: fetch the playlist as it is now, and replay.
              guard: { type: 'conflict', params: ({ event }) => event.error },
              target: 'rebasing',
            },
            {
              // Refused: dropped. Undo steps may name what it would have made, so they
              // go too. What's queued behind it still goes (the server skips anything
              // naming what the refused batch would have made).
              guard: { type: 'refused', params: ({ event }) => event.error },
              target: 'idle',
              actions: assign(({ context, event }) => ({
                refused: {
                  kind: 'refused',
                  error: asWriteError(event.error),
                  ops: context.inflight.map((q) => q.op),
                },
                inflight: [],
                undo: [],
              })),
            },
            { target: 'failed', actions: { type: 'fail', params: ({ event }) => event.error } },
          ],
        },
      },
      rebasing: {
        invoke: {
          src: 'refetch',
          input: ({ context }) => ({ playlistId: context.base.playlistId }),
          onDone: {
            target: 'sending',
            actions: assign(({ context, event }) => ({
              ...requeue(context),
              base: toPlaylistContent(event.output),
              conflicts: context.conflicts + 1,
            })),
          },
          onError: {
            target: 'failed',
            actions: { type: 'fail', params: ({ event }) => event.error },
          },
        },
      },
      // Edits are kept, shown, and sent again on Retry or the next edit.
      failed: {
        on: {
          RETRY: 'sending',
          EDIT: { target: 'sending', actions: 'enqueue' },
        },
      },
    },
  });
}

type DraftActor = ActorRefFrom<ReturnType<typeof draftMachine>>;
type DraftSnapshot = SnapshotFrom<ReturnType<typeof draftMachine>>;

function stateOf(snapshot: DraftSnapshot): DraftState {
  const { base, inflight, queue, undo, error, refused } = snapshot.context;
  return {
    content: replay(replay(base, inflight), queue),
    status: snapshot.matches('idle') ? 'saved' : snapshot.matches('failed') ? 'error' : 'saving',
    error: snapshot.matches('failed') ? error : undefined,
    refused,
    canUndo: undo.length > 0,
  };
}

/**
 * Resolves once the actor is idle or has failed. A refusal that arrives meanwhile
 * is its own outcome: nothing's left unsaved, but what the listener last wrote
 * isn't what the server has.
 */
function settled(actor: DraftActor): Promise<Settled> {
  const refusedBefore = actor.getSnapshot().context.refused;
  return new Promise((resolve) => {
    const done = (s: DraftSnapshot) => {
      const { refused, error } = s.context;
      if (s.matches('idle'))
        resolve(
          refused && refused !== refusedBefore
            ? { kind: 'refused', refusal: refused }
            : { kind: 'saved' }
        );
      else if (s.matches('failed'))
        resolve({ kind: 'failed', error: error ?? new PlaylistWriteError('unavailable') });
      else return false;
      return true;
    };
    if (done(actor.getSnapshot())) return;
    const sub = actor.subscribe((s) => {
      if (done(s)) sub.unsubscribe();
    });
  });
}

export function createDraftStore(
  initial: PlaylistContent,
  { transport, newId = newTypeId }: { transport: PlaylistTransport; newId?: NewId }
): DraftStore {
  const actor = createActor(draftMachine(transport), { input: initial }).start();
  // One DraftState per snapshot, so useSyncExternalStore sees a stable value.
  let cached: { snapshot: DraftSnapshot; state: DraftState } | undefined;
  const getState = () => {
    const snapshot = actor.getSnapshot();
    if (cached?.snapshot !== snapshot) cached = { snapshot, state: stateOf(snapshot) };
    return cached.state;
  };
  // Each edit (or undo) numbered, so its operations are sent together.
  let edits = 0;
  const queued = (ops: PlaylistOp[]): Queued[] => {
    const edit = ++edits;
    return ops.map((op) => ({ id: newId('playlist_operation'), op, edit }));
  };

  return {
    getState,
    subscribe(listener) {
      const sub = actor.subscribe(() => listener());
      return () => sub.unsubscribe();
    },
    edit(...ops) {
      // Worked out against what's shown, each op on top of the last; any refusal
      // throws before anything is sent.
      let content = getState().content;
      const applied: PlaylistOp[] = [];
      const steps: UndoStep[] = [];
      for (const op of ops) {
        const result = applyOp(content, op);
        if (result.status !== 'applied') continue;
        const inv = inverse(content, op, newId);
        steps.push({ ops: inv.ops, renamed: inv.renamed });
        applied.push(op);
        content = result.content;
      }
      if (!applied.length) return applied;
      actor.send({
        type: 'EDIT',
        ops: queued(applied),
        // Undone last first: one step, so one Undo puts it all back.
        step: {
          ops: steps.toReversed().flatMap((s) => s.ops),
          renamed: Object.assign({}, ...steps.map((s) => s.renamed)),
        },
      });
      return applied;
    },
    undo() {
      const step = actor.getSnapshot().context.undo.at(-1);
      if (!step) return;
      // What it re-creates gets new IDs: links to them, in its own text and in the
      // playlist's prose as it is now, follow.
      const ops = [
        ...step.ops.map((op) => retargetOpLinks(op, step.renamed)),
        ...retargetProse(getState().content, step.renamed),
      ];
      actor.send({ type: 'UNDO', ops: queued(ops) });
    },
    retry: () => actor.send({ type: 'RETRY' }),
    settle() {
      actor.send({ type: 'RETRY' });
      return settled(actor);
    },
  };
}
