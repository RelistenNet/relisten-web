// A playlist being edited (docs/playlist-editing.md, "Decisions"). The editor
// shows `content`: what the server confirmed (`base`), with the edits not yet
// confirmed applied on top by the same applyOp the server mirrors. Edits queue
// as operations and go out in batches held to the base revision:
//
// - structural edits (insert, move, delete) send at once;
// - text edits to one field merge while they wait, and send once typing stops;
// - a revision conflict (someone else saved first) refetches the playlist and
//   replays the edits on top; they address IDs, not positions, so they still fit;
// - an edit the server refuses (422) is dropped, and the content reverts;
// - anything else (offline, signed out) keeps the edits, waiting for retry().
//
// One batch is in flight at a time. Undo applies an edit's inverse as a new edit.

import { applyOp, applyOps, inverse, type NewId, remapIds } from '@/domain/playlistOps';
import {
  type PlaylistContent,
  type PlaylistOp,
  type PlaylistOperationStatus,
  toPlaylistContent,
} from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';
import { PlaylistWriteError, type PlaylistTransport } from './transport';

export type DraftStatus = 'saved' | 'saving' | 'error';

export type DraftState = {
  content: PlaylistContent;
  status: DraftStatus;
  /** Why the last save failed, while status is `error`. */
  error?: PlaylistWriteError;
  canUndo: boolean;
};

export type DraftStore = {
  getState(): DraftState;
  subscribe(listener: () => void): () => void;
  /**
   * Applies an edit now and queues it. Returns what the server will make of it:
   * only `applied` queues anything. Throws PlaylistOpError for an edit the server
   * would refuse outright (a text entry with no text, a nameless playlist).
   */
  edit(op: PlaylistOp): PlaylistOperationStatus;
  undo(): void;
  /** Sends whatever is waiting now (a blur, leaving the page, Retry). */
  flush(): Promise<void>;
  dispose(): void;
};

/** Edits replayed after this many conflicts in a row stop and report one. */
const MAX_CONFLICTS = 3;

type Queued = { id: string; op: PlaylistOp; key?: string };
/** An edit's inverse, and the IDs it re-creates under new names (see `inverse`). */
type UndoStep = { ops: PlaylistOp[]; renamed: Record<string, string>; key?: string };

/** Text edits to the same field merge while they wait: one request, one undo step. */
function textKey(op: PlaylistOp): string | undefined {
  switch (op.operation_type) {
    case 'update_entry':
      return `entry:${op.payload.entry_id}`;
    case 'update_segment':
      return `segment:${op.payload.segment_id}`;
    case 'update_metadata': {
      const fields = Object.keys(op.payload);
      return fields.length === 1 ? `metadata:${fields[0]}` : undefined;
    }
    default:
      return undefined;
  }
}

export function createDraftStore(
  initial: PlaylistContent,
  {
    transport,
    newId = newTypeId,
    textDelayMs = 800,
  }: { transport: PlaylistTransport; newId?: NewId; textDelayMs?: number }
): DraftStore {
  let base = initial;
  let inflight: Queued[] = [];
  let queue: Queued[] = [];
  let undoSteps: UndoStep[] = [];
  let state: DraftState = { content: initial, status: 'saved', canUndo: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let conflicts = 0;
  let disposed = false;
  const listeners = new Set<() => void>();

  const ops = (items: Queued[]) => items.map((q) => q.op);

  function update(next: Partial<DraftState>) {
    state = {
      ...state,
      // What the editor shows is always the confirmed content plus every waiting edit.
      content: applyOps(applyOps(base, ops(inflight)), ops(queue)),
      canUndo: undoSteps.length > 0,
      ...next,
    };
    listeners.forEach((l) => l());
  }

  function schedule(text: boolean) {
    clearTimeout(timer);
    // A structural edit sends everything waiting, text included.
    if (text) timer = setTimeout(() => void flush(), textDelayMs);
    else queueMicrotask(() => void flush());
  }

  function enqueue(op: PlaylistOp, record: boolean): PlaylistOperationStatus {
    const before = state.content;
    const { status } = applyOp(before, op); // throws for what the server refuses
    if (status !== 'applied') return status;
    const key = textKey(op);

    if (record) {
      const top = undoSteps.at(-1);
      // Typing into the same field again: the step already restores what it was before.
      if (!key || top?.key !== key) {
        const inv = inverse(before, op, newId);
        undoSteps.push({ ops: inv.ops, renamed: inv.renamed, key });
      }
    }

    const waiting = key ? queue.findIndex((q) => q.key === key) : -1;
    if (waiting >= 0) queue[waiting] = { ...queue[waiting], op };
    else queue.push({ id: newId('playlist_operation'), op, key });

    update({ status: 'saving', error: undefined });
    schedule(!!key);
    return status;
  }

  async function flush(): Promise<void> {
    clearTimeout(timer);
    if (disposed || inflight.length > 0 || queue.length === 0) return;
    inflight = queue;
    queue = [];
    update({ status: 'saving', error: undefined });

    try {
      const response = await transport.batch(
        base.playlistId,
        inflight.map((q) => ({ ...q.op, operation_id: q.id, base_revision: base.revision })),
        base.revision
      );
      base = {
        ...applyOps(base, ops(inflight)),
        revision: response.head_revision,
        generation: response.history_generation,
      };
      inflight = [];
      conflicts = 0;
      update({ status: queue.length ? 'saving' : 'saved' });
      if (queue.length) await flush();
    } catch (err) {
      const error = err instanceof PlaylistWriteError ? err : new PlaylistWriteError('unavailable');
      if (error.kind === 'conflict' && ++conflicts <= MAX_CONFLICTS) {
        // The batch wasn't applied: rebase it onto the playlist as it is now.
        try {
          base = toPlaylistContent(await transport.snapshot(base.playlistId));
        } catch (snapshotError) {
          return fail(
            snapshotError instanceof PlaylistWriteError
              ? snapshotError
              : new PlaylistWriteError('unavailable')
          );
        }
        queue = [...inflight, ...queue];
        inflight = [];
        update({});
        return flush();
      }
      if (error.kind === 'invalid') {
        // Refused: drop it. Undo steps may name what it would have made, so they go too.
        inflight = [];
        undoSteps = [];
        update({ status: queue.length ? 'saving' : 'error', error });
        if (queue.length) return flush();
        return;
      }
      fail(error);
    }
  }

  /** Keep the edits, waiting for retry (flush). */
  function fail(error: PlaylistWriteError) {
    queue = [...inflight, ...queue];
    inflight = [];
    conflicts = 0;
    update({ status: 'error', error });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    edit: (op) => enqueue(op, true),
    undo() {
      const step = undoSteps.pop();
      if (!step) return;
      for (const op of step.ops) enqueue(op, false);
      // The undo re-created things under new IDs: older steps follow them.
      undoSteps = undoSteps.map((s) => ({
        ...s,
        ops: s.ops.map((o) => remapIds(o, step.renamed)),
      }));
      // An undo sends at once, even a text one.
      schedule(false);
      update({});
    },
    flush,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      listeners.clear();
    },
  };
}
