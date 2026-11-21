// Playlist edits as pure functions over PlaylistContent (docs/playlist-editing.md).
// `applyOp` mirrors the User Service's evaluator (RelistenApi:
// RelistenUserService/Playlists/PlaylistEditor.cs), so an optimistic edit shows what
// the server will store: anchors that no longer exist fall back to the end, and a
// segment left with no entries and no description is removed. `inverse` gives the
// operations that undo one. No React, no network.

import type {
  PlaylistContent,
  PlaylistContentEntry,
  PlaylistContentSegment,
  PlaylistEntryInputWire,
  PlaylistOp,
  PlaylistOperationStatus,
} from './playlists';
import { newTypeId, type TypeIdPrefix } from './typeid';

export type NewId = (prefix: TypeIdPrefix) => string;

/** An edit the server refuses outright (422), rather than skipping. */
export class PlaylistOpError extends Error {}

/** The server's text normalization: trimmed, NFC, and blank as none. */
export function normalizeText(s: string | null | undefined): string | undefined {
  const value = s?.trim().normalize('NFC');
  return value ? value : undefined;
}

export type Applied = { content: PlaylistContent; status: PlaylistOperationStatus };

export function applyOp(content: PlaylistContent, op: PlaylistOp): Applied {
  const segments = content.segments;
  const skip = (status: PlaylistOperationStatus): Applied => ({ content, status });
  const done = (next: Partial<PlaylistContent>): Applied => ({
    content: { ...content, ...next },
    status: 'applied',
  });

  switch (op.operation_type) {
    case 'update_metadata': {
      const p = op.payload;
      const name = p.name !== undefined ? normalizeText(p.name) : content.name;
      if (!name) throw new PlaylistOpError('A playlist needs a name.');
      const description =
        p.description !== undefined ? normalizeText(p.description) : content.description;
      if (name === content.name && description === content.description) return skip('no_op');
      return done({ name, description });
    }

    case 'insert_segment': {
      const p = op.payload;
      if (has(content, [p.segment_id, ...p.entries.map((e) => e.entry_id)]))
        return skip('id_conflict');
      const at = position(
        segments.map((s) => s.id),
        p.after_segment_id,
        p.before_segment_id
      );
      const segment: PlaylistContentSegment = {
        id: p.segment_id,
        description: normalizeText(p.description),
        entries: p.entries.map(toEntry),
      };
      return done({ segments: insertAt(segments, at, [segment]) });
    }

    case 'update_segment': {
      const p = op.payload;
      const i = segmentIndex(content, p.segment_id);
      if (i < 0) return skip('target_missing');
      const segment = segments[i];
      if (p.description === undefined) return skip('no_op');
      const description = normalizeText(p.description);
      if (description === segment.description) return skip('no_op');
      return done({
        segments: pruned(replaceAt(segments, i, { ...segment, description }), p.segment_id),
      });
    }

    case 'move_segment': {
      const p = op.payload;
      const from = segmentIndex(content, p.segment_id);
      if (from < 0) return skip('target_missing');
      const rest = segments.filter((_, i) => i !== from);
      const to = position(
        rest.map((s) => s.id),
        p.after_segment_id,
        p.before_segment_id
      );
      if (to === from) return skip('no_op');
      return done({ segments: insertAt(rest, to, [segments[from]]) });
    }

    case 'delete_segment': {
      const i = segmentIndex(content, op.payload.segment_id);
      if (i < 0) return skip('target_missing');
      return done({ segments: segments.filter((_, j) => j !== i) });
    }

    case 'insert_entries': {
      const p = op.payload;
      const i = segmentIndex(content, p.segment_id);
      if (i < 0) return skip('parent_missing');
      if (
        has(
          content,
          p.entries.map((e) => e.entry_id)
        )
      )
        return skip('id_conflict');
      const segment = segments[i];
      const at = position(
        segment.entries.map((e) => e.id),
        p.after_entry_id,
        p.before_entry_id
      );
      const entries = insertAt(segment.entries, at, p.entries.map(toEntry));
      return done({ segments: replaceAt(segments, i, { ...segment, entries }) });
    }

    case 'update_entry': {
      const p = op.payload;
      const found = findEntry(content, p.entry_id);
      if (!found) return skip('target_missing');
      const { entry, segment, segmentIndex: si, entryIndex: ei } = found;
      if (p.description === undefined) return skip('no_op');
      const description = normalizeText(p.description);
      if (description === entry.description) return skip('no_op');
      if (entry.trackId === null && !description)
        throw new PlaylistOpError('Delete a text entry to remove its description.');
      const entries = replaceAt(segment.entries, ei, { ...entry, description });
      return done({ segments: replaceAt(segments, si, { ...segment, entries }) });
    }

    case 'move_entry': {
      const { entry_id, destination: d } = op.payload;
      const found = findEntry(content, entry_id);
      if (!found) return skip('target_missing');
      const { entry, segment: oldSegment } = found;
      const without = segments.map((s) =>
        s.id === oldSegment.id ? { ...s, entries: s.entries.filter((e) => e.id !== entry_id) } : s
      );

      let next: PlaylistContentSegment[];
      if ('new_segment_id' in d) {
        if (has(content, [d.new_segment_id])) return skip('id_conflict');
        // Placed before the old segment is pruned: it can still be the anchor.
        const at = position(
          without.map((s) => s.id),
          d.after_segment_id,
          d.before_segment_id
        );
        next = insertAt(without, at, [{ id: d.new_segment_id, entries: [entry] }]);
      } else {
        const ti = segmentIndex(content, d.segment_id);
        if (ti < 0) return skip('parent_missing');
        const target = without[ti];
        const at = position(
          target.entries.map((e) => e.id),
          d.after_entry_id,
          d.before_entry_id
        );
        if (target.id === oldSegment.id && at === found.entryIndex) return skip('no_op');
        next = replaceAt(without, ti, {
          ...target,
          entries: insertAt(target.entries, at, [entry]),
        });
      }
      return done({ segments: pruned(next, oldSegment.id) });
    }

    case 'delete_entry': {
      const found = findEntry(content, op.payload.entry_id);
      if (!found) return skip('target_missing');
      const { segment, segmentIndex: si, entryIndex: ei } = found;
      const entries = segment.entries.filter((_, j) => j !== ei);
      return done({
        segments: pruned(replaceAt(segments, si, { ...segment, entries }), segment.id),
      });
    }
  }
}

/** Applies operations in order, as a batch does. */
export function applyOps(content: PlaylistContent, ops: readonly PlaylistOp[]): PlaylistContent {
  return ops.reduce((c, op) => applyOp(c, op).content, content);
}

export type Inverse = {
  /** Undoes `op` when applied, in order, right after it. Empty when `op` changes nothing. */
  ops: PlaylistOp[];
  /**
   * IDs the undo re-creates under new names (the server never reuses an ID, even
   * a deleted one). Older undo steps that name the old IDs need `remapIds`.
   */
  renamed: Record<string, string>;
};

/** What undoes `op`, computed from the content before it. */
export function inverse(
  before: PlaylistContent,
  op: PlaylistOp,
  newId: NewId = newTypeId
): Inverse {
  const after = applyOp(before, op);
  const none: Inverse = { ops: [], renamed: {} };
  if (after.status !== 'applied') return none;
  const only = (o: PlaylistOp): Inverse => ({ ops: [o], renamed: {} });

  switch (op.operation_type) {
    case 'update_metadata': {
      const p = op.payload;
      return only({
        operation_type: 'update_metadata',
        payload: {
          ...(p.name !== undefined && { name: before.name }),
          ...(p.description !== undefined && { description: before.description ?? null }),
        },
      });
    }

    case 'insert_segment':
      return only({
        operation_type: 'delete_segment',
        payload: { segment_id: op.payload.segment_id },
      });

    case 'update_segment': {
      const i = segmentIndex(before, op.payload.segment_id);
      // Clearing the description of a segment with no entries removes it.
      if (segmentIndex(after.content, op.payload.segment_id) < 0)
        return restoreSegment(before, i, newId);
      return only({
        operation_type: 'update_segment',
        payload: {
          segment_id: op.payload.segment_id,
          description: before.segments[i].description ?? null,
        },
      });
    }

    case 'move_segment': {
      const i = segmentIndex(before, op.payload.segment_id);
      return only({
        operation_type: 'move_segment',
        payload: { segment_id: op.payload.segment_id, ...segmentAnchor(before.segments, i) },
      });
    }

    case 'delete_segment':
      return restoreSegment(before, segmentIndex(before, op.payload.segment_id), newId);

    case 'insert_entries':
      return {
        ops: op.payload.entries.map((e) => ({
          operation_type: 'delete_entry' as const,
          payload: { entry_id: e.entry_id },
        })),
        renamed: {},
      };

    case 'update_entry': {
      const { entry } = entryOf(before, op.payload.entry_id);
      return only({
        operation_type: 'update_entry',
        payload: { entry_id: entry.id, description: entry.description ?? null },
      });
    }

    case 'move_entry': {
      const found = entryOf(before, op.payload.entry_id);
      const { segment, segmentIndex: si, entryIndex: ei } = found;
      if (segmentIndex(after.content, segment.id) >= 0) {
        return only({
          operation_type: 'move_entry',
          payload: {
            entry_id: found.entry.id,
            destination: { segment_id: segment.id, ...entryAnchor(segment.entries, ei) },
          },
        });
      }
      // The move emptied its segment, which went with it: move back into a new one.
      const segmentId = newId('playlist_segment');
      return {
        ops: [
          {
            operation_type: 'move_entry',
            payload: {
              entry_id: found.entry.id,
              destination: { new_segment_id: segmentId, ...segmentAnchor(before.segments, si) },
            },
          },
        ],
        renamed: { [segment.id]: segmentId },
      };
    }

    case 'delete_entry': {
      const found = entryOf(before, op.payload.entry_id);
      const { entry, segment, segmentIndex: si, entryIndex: ei } = found;
      if (segmentIndex(after.content, segment.id) < 0) return restoreSegment(before, si, newId);
      const entryId = newId('playlist_entry');
      return {
        ops: [
          {
            operation_type: 'insert_entries',
            payload: {
              segment_id: segment.id,
              entries: [toInput(entry, entryId)],
              ...entryAnchor(segment.entries, ei),
            },
          },
        ],
        renamed: { [entry.id]: entryId },
      };
    }
  }
}

/** `op` with every ID in `renamed` replaced by its new name. */
export function remapIds(op: PlaylistOp, renamed: Record<string, string>): PlaylistOp {
  if (Object.keys(renamed).length === 0) return op;
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return renamed[value] ?? value;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
    return value;
  };
  return walk(op) as PlaylistOp;
}

// ---- Helpers --------------------------------------------------------------------

/** The server's placement: after `after` if it's there, else before `before`, else last. */
function position(ids: readonly string[], after?: string, before?: string): number {
  const a = after === undefined ? -1 : ids.indexOf(after);
  if (a >= 0) return a + 1;
  const b = before === undefined ? -1 : ids.indexOf(before);
  return b >= 0 ? b : ids.length;
}

/** Anchors that put something back at index `i` of `items`, once it's gone from there. */
function anchor(items: readonly { id: string }[], i: number) {
  const previous = items[i - 1];
  const next = items[i + 1];
  return { after: previous?.id, before: previous ? undefined : next?.id };
}

function segmentAnchor(segments: readonly PlaylistContentSegment[], i: number) {
  const { after, before } = anchor(segments, i);
  return {
    ...(after && { after_segment_id: after }),
    ...(before && { before_segment_id: before }),
  };
}

function entryAnchor(entries: readonly PlaylistContentEntry[], i: number) {
  const { after, before } = anchor(entries, i);
  return {
    ...(after && { after_entry_id: after }),
    ...(before && { before_entry_id: before }),
  };
}

/** Re-creates segment `i` of `before`, entries and all, under new IDs where it was. */
function restoreSegment(before: PlaylistContent, i: number, newId: NewId): Inverse {
  const segment = before.segments[i];
  const segmentId = newId('playlist_segment');
  const renamed: Record<string, string> = { [segment.id]: segmentId };
  const entries = segment.entries.map((e) => {
    const id = newId('playlist_entry');
    renamed[e.id] = id;
    return toInput(e, id);
  });
  return {
    ops: [
      {
        operation_type: 'insert_segment',
        payload: {
          segment_id: segmentId,
          entries,
          ...(segment.description && { description: segment.description }),
          ...segmentAnchor(before.segments, i),
        },
      },
    ],
    renamed,
  };
}

function toEntry(e: PlaylistEntryInputWire): PlaylistContentEntry {
  return { id: e.entry_id, trackId: e.track_id ?? null, description: normalizeText(e.description) };
}

function toInput(e: PlaylistContentEntry, id: string): PlaylistEntryInputWire {
  return {
    entry_id: id,
    ...(e.trackId && { track_id: e.trackId }),
    ...(e.description && { description: e.description }),
  };
}

function segmentIndex(content: PlaylistContent, id: string): number {
  return content.segments.findIndex((s) => s.id === id);
}

function findEntry(content: PlaylistContent, id: string) {
  for (const [segmentIndex, segment] of content.segments.entries()) {
    const entryIndex = segment.entries.findIndex((e) => e.id === id);
    if (entryIndex >= 0)
      return { entry: segment.entries[entryIndex], segment, segmentIndex, entryIndex };
  }
  return undefined;
}

/** An entry `inverse` knows is there: the operation it's undoing applied to it. */
function entryOf(content: PlaylistContent, id: string) {
  const found = findEntry(content, id);
  if (!found) throw new Error(`No entry ${id}`);
  return found;
}

/** Whether any of `ids` is a live segment or entry. (Deleted IDs are the server's to catch.) */
function has(content: PlaylistContent, ids: readonly string[]): boolean {
  const wanted = new Set(ids);
  return content.segments.some((s) => wanted.has(s.id) || s.entries.some((e) => wanted.has(e.id)));
}

/** Drops segment `id` if it has no entries and no description, as the server does. */
function pruned(segments: PlaylistContentSegment[], id: string): PlaylistContentSegment[] {
  return segments.filter((s) => s.id !== id || s.entries.length > 0 || s.description);
}

function insertAt<T>(items: readonly T[], at: number, added: readonly T[]): T[] {
  return [...items.slice(0, at), ...added, ...items.slice(at)];
}

function replaceAt<T>(items: readonly T[], at: number, item: T): T[] {
  return items.map((x, i) => (i === at ? item : x));
}
