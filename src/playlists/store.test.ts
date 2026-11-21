import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyOps } from '@/domain/playlistOps';
import type {
  PlaylistBatchResponseWire,
  PlaylistContent,
  PlaylistOp,
  PlaylistOperationWire,
  PlaylistSnapshotWire,
} from '@/domain/playlists';
import { createDraftStore } from './store';
import { PlaylistWriteError, type PlaylistTransport } from './transport';

const content: PlaylistContent = {
  playlistId: 'playlist_x',
  generation: 'g',
  revision: 1,
  name: 'Mix',
  segments: [
    { id: 's1', entries: [{ id: 'e1', trackId: 't1' }] },
    { id: 's2', description: 'Set two', entries: [{ id: 'e2', trackId: 't2' }] },
  ],
};

const shape = (c: PlaylistContent) =>
  c.segments.map((s) => `${s.id}:${s.entries.map((e) => e.id).join(',')}`).join(' | ');

const op = <T extends PlaylistOp['operation_type']>(
  operation_type: T,
  payload: Extract<PlaylistOp, { operation_type: T }>['payload']
) => ({ operation_type, payload }) as PlaylistOp;

/** A server that applies batches with the shared evaluator, or answers as told. */
function fakeServer(start = content) {
  let server = start;
  const batches: { ops: PlaylistOperationWire[]; expected?: number }[] = [];
  const failures: PlaylistWriteError[] = [];
  const transport: PlaylistTransport = {
    library: vi.fn(),
    create: vi.fn(),
    publish: vi.fn(),
    report: vi.fn(),
    snapshot: vi.fn(
      async () =>
        ({
          history_generation: 'g',
          playlist_id: server.playlistId,
          revision: server.revision,
          archived: false,
          metadata: { name: server.name, description: server.description },
          updated_at: '',
          segments: server.segments.map((s, i) => ({
            segment_id: s.id,
            rank: String(i),
            description: s.description,
            entries: s.entries.map((e, j) => ({
              entry_id: e.id,
              track_id: e.trackId,
              rank: String(j),
              description: e.description,
            })),
          })),
        }) satisfies PlaylistSnapshotWire
    ),
    batch: vi.fn(async (_id, ops: PlaylistOperationWire[], expected?: number) => {
      batches.push({ ops, expected });
      const failure = failures.shift();
      if (failure) throw failure;
      if (expected !== undefined && expected !== server.revision)
        throw new PlaylistWriteError('conflict');
      server = { ...applyOps(server, ops), revision: server.revision + 1 };
      return {
        contract_version: 1,
        history_generation: 'g',
        head_revision: server.revision,
        results: ops.map((o) => ({
          operation_id: o.operation_id,
          status: 'applied',
          revision: server.revision,
        })),
      } satisfies PlaylistBatchResponseWire;
    }),
  };
  return {
    transport,
    batches,
    failNext: (e: PlaylistWriteError) => failures.push(e),
    get server() {
      return server;
    },
    /** Someone else's edit, straight to the server. */
    external(o: PlaylistOp) {
      server = { ...applyOps(server, [o]), revision: server.revision + 1 };
    },
  };
}

function ids() {
  let n = 0;
  return (prefix: string) => `${prefix}_${++n}`;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Lets queued microtasks and the fake server's promises run. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe('createDraftStore', () => {
  it('shows an edit at once and sends structural edits right away', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    store.edit(op('move_entry', { entry_id: 'e2', destination: { segment_id: 's1' } }));
    expect(shape(store.getState().content)).toBe('s1:e1,e2 | s2:');
    expect(store.getState().status).toBe('saving');
    await settle();
    expect(server.batches).toHaveLength(1);
    expect(server.batches[0].expected).toBe(1);
    expect(store.getState().status).toBe('saved');
    expect(shape(server.server)).toBe(shape(store.getState().content));
  });

  it('sends a text edit at once, as its own undo step', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    store.edit(op('update_entry', { entry_id: 'e1', description: 'Wow' }));
    await settle();
    expect(server.batches.map((b) => b.ops.map((o) => o.payload))).toEqual([
      [{ entry_id: 'e1', description: 'Wow' }],
    ]);
    store.undo();
    expect(store.getState().content.segments[0].entries[0].description).toBeUndefined();
    expect(store.getState().canUndo).toBe(false);
  });

  it('replays its edits on top of someone else’s after a conflict', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.external(op('update_metadata', { name: 'Renamed elsewhere' }));
    store.edit(op('delete_entry', { entry_id: 'e1' }));
    await settle();
    expect(server.batches.map((b) => b.expected)).toEqual([1, 2]);
    expect(store.getState().status).toBe('saved');
    expect(store.getState().content.name).toBe('Renamed elsewhere');
    expect(shape(store.getState().content)).toBe('s2:e2');
  });

  it('drops an edit the server refuses, says why, and leaves nothing unsaved', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.failNext(new PlaylistWriteError('invalid', 'description cannot contain HTML.', 422));
    const refusedOp = op('delete_entry', { entry_id: 'e1' });
    store.edit(refusedOp);
    await settle();
    expect(shape(store.getState().content)).toBe(shape(content));
    expect(store.getState()).toMatchObject({ status: 'saved', canUndo: false });
    expect(store.getState().refused?.error.detail).toBe('description cannot contain HTML.');
    expect(store.getState().refused?.ops).toEqual([refusedOp]);
  });

  it('keeps edits through an outage and sends them, with the same ids, on retry', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.failNext(new PlaylistWriteError('unavailable'));
    store.edit(op('delete_entry', { entry_id: 'e1' }));
    await settle();
    expect(store.getState().status).toBe('error');
    expect(shape(store.getState().content)).toBe('s2:e2');
    store.retry();
    await settle();
    expect(store.getState().status).toBe('saved');
    expect(server.batches[1].ops[0].operation_id).toBe(server.batches[0].ops[0].operation_id);
    expect(shape(server.server)).toBe('s2:e2');
  });

  it('undoes through re-created ids', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    // Move e1 out of s1 (s1 goes with it), then delete it.
    store.edit(op('move_entry', { entry_id: 'e1', destination: { segment_id: 's2' } }));
    store.edit(op('delete_entry', { entry_id: 'e1' }));
    await settle();
    store.undo(); // e1 comes back, under a new id
    store.undo(); // and moves back into a segment of its own
    await settle();
    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().content.segments.map((s) => s.entries.map((e) => e.trackId))).toEqual([
      ['t1'],
      ['t2'],
    ]);
    expect(shape(server.server)).toBe(shape(store.getState().content));
  });

  it('gives each edit to a field its own undo step', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    store.edit(op('update_metadata', { name: 'B' }));
    store.edit(op('update_metadata', { name: 'C' }));
    await settle();
    store.undo();
    expect(store.getState().content.name).toBe('B');
    store.undo();
    expect(store.getState().content.name).toBe('Mix');
  });

  it('keeps a refusal showing while the edits queued behind it still go', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.failNext(new PlaylistWriteError('invalid', 'Too long.', 422));
    store.edit(op('delete_entry', { entry_id: 'e1' })); // in flight, to be refused
    store.edit(op('update_segment', { segment_id: 's2', description: 'Later' }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(server.batches).toHaveLength(2);
    expect(store.getState()).toMatchObject({ status: 'saved' });
    expect(store.getState().refused?.error.detail).toBe('Too long.');
    // The next edit clears it.
    store.edit(op('update_segment', { segment_id: 's2', description: 'Again' }));
    expect(store.getState().refused).toBeUndefined();
  });

  it('says whether everything saved, retrying what failed', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.failNext(new PlaylistWriteError('unavailable'));
    store.edit(op('update_metadata', { name: 'Renamed' }));
    await settle();
    expect(store.getState().status).toBe('error');
    server.failNext(new PlaylistWriteError('signed-out'));
    const first = store.whenSaved();
    await settle();
    await expect(first).resolves.toBe(false);
    const second = store.whenSaved();
    await settle();
    await expect(second).resolves.toBe(true);
    expect(server.server.name).toBe('Renamed');
  });

  it('saves what’s waiting when the editor closes, and says if it couldn’t', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    server.failNext(new PlaylistWriteError('unavailable'));
    server.failNext(new PlaylistWriteError('unavailable'));
    store.edit(op('update_metadata', { name: 'Renamed' }));
    const closed = store.whenSaved();
    await settle();
    await expect(closed).resolves.toBe(false);
  });

  it('sends one batch at a time; edits made meanwhile go next', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    store.edit(op('delete_entry', { entry_id: 'e1' })); // in flight
    store.edit(op('update_segment', { segment_id: 's2', description: 'Later' }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(server.batches.map((b) => b.ops.map((o) => o.operation_type))).toEqual([
      ['delete_entry'],
      ['update_segment'],
    ]);
    expect(server.batches[1].expected).toBe(2);
  });
});

describe('edit, with several operations', () => {
  beforeEach(() => vi.useFakeTimers());
  it('applies edits together and undoes them as one', async () => {
    const server = fakeServer();
    const store = createDraftStore(content, { transport: server.transport, newId: ids() });
    // s2's text moves out to stand alone: a new segment with it, and s2 loses it.
    store.edit(
      op('insert_segment', { segment_id: 'sN', entries: [], description: 'Set two' }),
      op('update_segment', { segment_id: 's2', description: null })
    );
    await settle();
    expect(store.getState().content.segments.map((s) => s.description)).toEqual([
      undefined,
      undefined,
      'Set two',
    ]);
    store.undo();
    await settle();
    expect(store.getState().content.segments.map((s) => s.description)).toEqual([
      undefined,
      'Set two',
    ]);
    expect(store.getState().canUndo).toBe(false);
  });
});
