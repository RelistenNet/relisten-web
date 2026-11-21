import { describe, expect, it } from 'vitest';
import { applyOp, applyOps, inverse, type NewId, PlaylistOpError, remapIds } from './playlistOps';
import type { PlaylistContent, PlaylistOp } from './playlists';

// Segments: s1 (described: e1, e2), s2 (e3), s3 (e4, a text entry, e5).
const base: PlaylistContent = {
  playlistId: 'playlist_x',
  generation: 'g',
  revision: 7,
  name: 'Mix',
  description: 'About it',
  segments: [
    {
      id: 's1',
      description: 'Intro',
      entries: [
        { id: 'e1', trackId: 't1' },
        { id: 'e2', trackId: 't2', description: 'Note' },
      ],
    },
    { id: 's2', entries: [{ id: 'e3', trackId: 't3' }] },
    {
      id: 's3',
      entries: [
        { id: 'e4', trackId: null, description: 'Text' },
        { id: 'e5', trackId: 't5' },
      ],
    },
  ],
};

/** The layout, for compact assertions: `s1:e1,e2 | s2:e3`. */
const shape = (c: PlaylistContent) =>
  c.segments.map((s) => `${s.id}:${s.entries.map((e) => e.id).join(',')}`).join(' | ');

/** Deterministic ids for inverses: n1, n2, … */
function counter(): NewId {
  let n = 0;
  return () => `n${++n}`;
}

/** `content` with renamed ids mapped back, to compare a round trip with the original. */
function unrename(content: PlaylistContent, renamed: Record<string, string>): PlaylistContent {
  const back = Object.fromEntries(Object.entries(renamed).map(([a, b]) => [b, a]));
  return {
    ...content,
    segments: content.segments.map((s) => ({
      ...s,
      id: back[s.id] ?? s.id,
      entries: s.entries.map((e) => ({ ...e, id: back[e.id] ?? e.id })),
    })),
  };
}

const op = <T extends PlaylistOp['operation_type']>(
  operation_type: T,
  payload: Extract<PlaylistOp, { operation_type: T }>['payload']
) => ({ operation_type, payload }) as PlaylistOp;

describe('applyOp', () => {
  it('places by anchor: after, else before, else last', () => {
    const insert = (anchor: object) =>
      shape(
        applyOp(
          base,
          op('insert_entries', {
            segment_id: 's1',
            entries: [{ entry_id: 'x', track_id: 't9' }],
            ...anchor,
          })
        ).content
      ).split(' | ')[0];
    expect(insert({ after_entry_id: 'e1' })).toBe('s1:e1,x,e2');
    expect(insert({ before_entry_id: 'e1' })).toBe('s1:x,e1,e2');
    expect(insert({ after_entry_id: 'gone', before_entry_id: 'e2' })).toBe('s1:e1,x,e2');
    expect(insert({ after_entry_id: 'gone' })).toBe('s1:e1,e2,x');
    expect(insert({})).toBe('s1:e1,e2,x');
  });

  it('removes a segment left with no entries and no description', () => {
    const moved = applyOp(
      base,
      op('move_entry', { entry_id: 'e3', destination: { segment_id: 's1' } })
    );
    expect(shape(moved.content)).toBe('s1:e1,e2,e3 | s3:e4,e5');

    // A described segment stays, even when empty.
    const emptied = applyOps(base, [
      op('delete_entry', { entry_id: 'e1' }),
      op('delete_entry', { entry_id: 'e2' }),
    ]);
    expect(shape(emptied)).toBe('s1: | s2:e3 | s3:e4,e5');
    // …until its description is cleared.
    const cleared = applyOp(emptied, op('update_segment', { segment_id: 's1', description: null }));
    expect(shape(cleared.content)).toBe('s2:e3 | s3:e4,e5');
  });

  it('moves an entry into a new segment, anchored to the one it emptied', () => {
    const { content } = applyOp(
      base,
      op('move_entry', {
        entry_id: 'e3',
        destination: { new_segment_id: 'sN', after_segment_id: 's2' },
      })
    );
    expect(shape(content)).toBe('s1:e1,e2 | sN:e3 | s3:e4,e5');
  });

  it('reports what the server would skip, and changes nothing', () => {
    const cases: [PlaylistOp, string][] = [
      [op('delete_entry', { entry_id: 'nope' }), 'target_missing'],
      [
        op('insert_entries', { segment_id: 'nope', entries: [{ entry_id: 'x' }] }),
        'parent_missing',
      ],
      [op('insert_entries', { segment_id: 's1', entries: [{ entry_id: 'e5' }] }), 'id_conflict'],
      [op('move_entry', { entry_id: 'e2', destination: { segment_id: 's1' } }), 'no_op'],
      [
        op('move_entry', {
          entry_id: 'e1',
          destination: { segment_id: 's1', before_entry_id: 'e2' },
        }),
        'no_op',
      ],
      [op('move_segment', { segment_id: 's3' }), 'no_op'],
      [op('update_entry', { entry_id: 'e2', description: '  Note ' }), 'no_op'],
      [op('update_metadata', {}), 'no_op'],
    ];
    for (const [o, status] of cases) {
      const result = applyOp(base, o);
      expect(result.status, o.operation_type).toBe(status);
      expect(result.content).toBe(base);
    }
  });

  it('normalizes text as the server does', () => {
    const { content } = applyOp(
      base,
      op('update_entry', { entry_id: 'e1', description: ' Café ' })
    );
    expect(content.segments[0].entries[0].description).toBe('Café');
    const blank = applyOp(base, op('update_metadata', { description: '   ' }));
    expect(blank.content.description).toBeUndefined();
  });

  it('refuses what the server refuses', () => {
    expect(() => applyOp(base, op('update_entry', { entry_id: 'e4', description: null }))).toThrow(
      PlaylistOpError
    );
    expect(() => applyOp(base, op('update_metadata', { name: ' ' }))).toThrow(PlaylistOpError);
  });
});

describe('inverse', () => {
  const cases: PlaylistOp[] = [
    op('update_metadata', { name: 'New', description: null }),
    op('insert_segment', {
      segment_id: 'sN',
      entries: [{ entry_id: 'x', track_id: 't9' }],
      after_segment_id: 's1',
    }),
    op('update_segment', { segment_id: 's1', description: 'Changed' }),
    op('update_segment', { segment_id: 's2', description: 'Now described' }),
    op('move_segment', { segment_id: 's1', after_segment_id: 's3' }),
    op('move_segment', { segment_id: 's3', before_segment_id: 's1' }),
    op('delete_segment', { segment_id: 's1' }),
    op('delete_segment', { segment_id: 's3' }),
    op('insert_entries', {
      segment_id: 's2',
      entries: [
        { entry_id: 'x', track_id: 't9' },
        { entry_id: 'y', description: 'Hi' },
      ],
      before_entry_id: 'e3',
    }),
    op('update_entry', { entry_id: 'e2', description: null }),
    op('update_entry', { entry_id: 'e4', description: 'Other text' }),
    op('move_entry', { entry_id: 'e1', destination: { segment_id: 's3', after_entry_id: 'e4' } }),
    op('move_entry', { entry_id: 'e2', destination: { segment_id: 's1', before_entry_id: 'e1' } }),
    op('move_entry', { entry_id: 'e3', destination: { segment_id: 's3' } }), // empties s2
    op('move_entry', {
      entry_id: 'e3',
      destination: { new_segment_id: 'sN', after_segment_id: 's3' },
    }),
    op('move_entry', {
      entry_id: 'e5',
      destination: { new_segment_id: 'sN', before_segment_id: 's1' },
    }),
    op('delete_entry', { entry_id: 'e1' }),
    op('delete_entry', { entry_id: 'e5' }),
    op('delete_entry', { entry_id: 'e3' }), // empties s2
  ];

  it.each(cases.map((o) => [`${o.operation_type} ${JSON.stringify(o.payload)}`, o] as const))(
    'undoes %s',
    (_, o) => {
      const after = applyOp(base, o);
      expect(after.status).toBe('applied');
      const undo = inverse(base, o, counter());
      expect(undo.ops.length).toBeGreaterThan(0);
      const restored = applyOps(after.content, undo.ops);
      expect(unrename(restored, undo.renamed)).toEqual(base);
    }
  );

  it('is empty for an operation that changes nothing', () => {
    expect(inverse(base, op('move_segment', { segment_id: 's3' })).ops).toEqual([]);
    expect(inverse(base, op('delete_entry', { entry_id: 'nope' })).ops).toEqual([]);
  });

  it('chains undos through renamed ids', () => {
    const ids = counter();
    // Move e3 into s1 (emptying s2), then delete it.
    const move = op('move_entry', { entry_id: 'e3', destination: { segment_id: 's1' } });
    const del = op('delete_entry', { entry_id: 'e3' });
    const undoMove = inverse(base, move, ids);
    const moved = applyOp(base, move).content;
    const undoDelete = inverse(moved, del, ids);
    const deleted = applyOp(moved, del).content;

    // Undo the delete (e3 comes back as n2), then the move, renamed to match.
    const back = applyOps(deleted, undoDelete.ops);
    const restored = applyOps(
      back,
      undoMove.ops.map((o) => remapIds(o, undoDelete.renamed))
    );
    expect(unrename(restored, { ...undoMove.renamed, ...undoDelete.renamed })).toEqual(base);
  });
});

describe('remapIds and links', () => {
  it('renames IDs as values and inside timestamp links, and leaves other text alone', () => {
    const op: PlaylistOp = {
      operation_type: 'update_entry',
      payload: {
        entry_id: 'e1',
        description: 'At [2:00](#entry=e1&t=2:00), not e10 or #entry=e9.',
      },
    };
    expect(remapIds(op, { e1: 'n1' })).toEqual({
      operation_type: 'update_entry',
      payload: {
        entry_id: 'n1',
        description: 'At [2:00](#entry=n1&t=2:00), not e10 or #entry=e9.',
      },
    });
  });
});
