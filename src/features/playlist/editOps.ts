import { type NewId, normalizeText } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistContentSegment, PlaylistOp } from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';
import type { ProseOwner } from './PlaylistArticle';

// The editor's menu actions as operations (docs/playlist-editing.md). Authors
// never pick a storage shape: where they act decides it. Pure, so the moves at
// segment boundaries are tested (editOps.test.ts).

function locate(content: PlaylistContent, entryId: string) {
  for (const [si, segment] of content.segments.entries()) {
    const ei = segment.entries.findIndex((e) => e.id === entryId);
    if (ei >= 0) return { segment, si, ei };
  }
  return undefined;
}

/**
 * Moves an entry one place up or down. Inside its segment it swaps with its
 * neighbor; at the segment's edge it crosses into the next segment over (the end
 * of the one above, the start of the one below), or, past a segment of prose
 * alone, into a new segment of its own on the far side. Null at the very top or
 * bottom.
 */
export function moveEntry(
  content: PlaylistContent,
  entryId: string,
  direction: -1 | 1,
  newId: NewId = newTypeId
): PlaylistOp | null {
  const at = locate(content, entryId);
  if (!at) return null;
  const { segment, si, ei } = at;
  const neighbor = segment.entries[ei + direction];
  if (neighbor) {
    return {
      operation_type: 'move_entry',
      payload: {
        entry_id: entryId,
        destination:
          direction < 0
            ? { segment_id: segment.id, before_entry_id: neighbor.id }
            : { segment_id: segment.id, after_entry_id: neighbor.id },
      },
    };
  }
  const next: PlaylistContentSegment | undefined = content.segments[si + direction];
  if (!next) return null;
  if (next.entries.length === 0) {
    // Prose alone: hop over it, into a group of its own.
    return {
      operation_type: 'move_entry',
      payload: {
        entry_id: entryId,
        destination:
          direction < 0
            ? { new_segment_id: newId('playlist_segment'), before_segment_id: next.id }
            : { new_segment_id: newId('playlist_segment'), after_segment_id: next.id },
      },
    };
  }
  return {
    operation_type: 'move_entry',
    payload: {
      entry_id: entryId,
      destination:
        direction < 0
          ? { segment_id: next.id }
          : { segment_id: next.id, before_entry_id: next.entries[0].id },
    },
  };
}

/** Out of its group, into one of its own right after it. */
export function moveToOwnGroup(
  content: PlaylistContent,
  entryId: string,
  newId: NewId = newTypeId
): PlaylistOp | null {
  const at = locate(content, entryId);
  if (!at || at.segment.entries.length === 1) return null;
  return {
    operation_type: 'move_entry',
    payload: {
      entry_id: entryId,
      destination: { new_segment_id: newId('playlist_segment'), after_segment_id: at.segment.id },
    },
  };
}

/** To the end of another section. */
export function moveToSection(entryId: string, segmentId: string): PlaylistOp {
  return {
    operation_type: 'move_entry',
    payload: { entry_id: entryId, destination: { segment_id: segmentId } },
  };
}

/**
 * Saves edited prose for its owner. Clearing a track's note or a section's
 * comment removes it; clearing a text block removes the block (a text entry
 * can't be empty, and a segment of prose alone goes when its prose does).
 * Null when nothing changed.
 */
export function saveProse(
  content: PlaylistContent,
  owner: ProseOwner,
  text: string
): PlaylistOp | null {
  const value = normalizeText(text);
  switch (owner.kind) {
    case 'playlist':
      return value === content.description
        ? null
        : { operation_type: 'update_metadata', payload: { description: value ?? null } };
    case 'segment':
      return segmentProse(content, owner.id, value);
    case 'note': {
      const entry = locate(content, owner.id);
      if (!entry || entry.segment.entries[entry.ei].description === value) return null;
      return {
        operation_type: 'update_entry',
        payload: { entry_id: owner.id, description: value ?? null },
      };
    }
    case 'text': {
      // A prose-only segment's text, or a text entry's.
      if (content.segments.some((s) => s.id === owner.id))
        return segmentProse(content, owner.id, value);
      const entry = locate(content, owner.id);
      if (!entry || entry.segment.entries[entry.ei].description === value) return null;
      return value
        ? { operation_type: 'update_entry', payload: { entry_id: owner.id, description: value } }
        : { operation_type: 'delete_entry', payload: { entry_id: owner.id } };
    }
  }
}

function segmentProse(
  content: PlaylistContent,
  segmentId: string,
  value: string | undefined
): PlaylistOp | null {
  const segment = content.segments.find((s) => s.id === segmentId);
  if (!segment || segment.description === value) return null;
  return {
    operation_type: 'update_segment',
    payload: { segment_id: segmentId, description: value ?? null },
  };
}

/** Removes a text block: a text entry, or a segment of prose alone. */
export function removeText(content: PlaylistContent, id: string): PlaylistOp {
  return content.segments.some((s) => s.id === id)
    ? { operation_type: 'delete_segment', payload: { segment_id: id } }
    : { operation_type: 'delete_entry', payload: { entry_id: id } };
}

/**
 * New text at a gap, between `before` (the last entry or segment above, if any)
 * and the rows below. Inside a segment it's a text entry there; between
 * segments, a segment of prose alone.
 */
export function insertText(
  content: PlaylistContent,
  gap: { above?: { id: string; segmentId: string }; below?: { segmentId: string } },
  text: string,
  newId: NewId = newTypeId
): PlaylistOp | null {
  const value = normalizeText(text);
  if (!value) return null;
  const { above, below } = gap;
  if (above && below && above.segmentId === below.segmentId && above.id !== above.segmentId) {
    return {
      operation_type: 'insert_entries',
      payload: {
        segment_id: above.segmentId,
        entries: [{ entry_id: newId('playlist_entry'), description: value }],
        after_entry_id: above.id,
      },
    };
  }
  return {
    operation_type: 'insert_segment',
    payload: {
      segment_id: newId('playlist_segment'),
      entries: [],
      description: value,
      ...(above
        ? { after_segment_id: above.segmentId }
        : below
          ? { before_segment_id: below.segmentId }
          : {}),
    },
  };
}

/** The text as written, for the prose an owner has: what its editor opens with. */
export function sourceOf(content: PlaylistContent, owner: ProseOwner): string {
  switch (owner.kind) {
    case 'playlist':
      return content.description ?? '';
    case 'segment':
      return content.segments.find((s) => s.id === owner.id)?.description ?? '';
    case 'text':
    case 'note': {
      const segment = content.segments.find((s) => s.id === owner.id);
      if (segment) return segment.description ?? '';
      const at = locate(content, owner.id);
      return at?.segment.entries[at.ei].description ?? '';
    }
  }
}

/** A whole segment (a section or group) one place up or down among segments; null at an end. */
export function moveSegmentBy(
  content: PlaylistContent,
  segmentId: string,
  direction: -1 | 1
): PlaylistOp | null {
  const i = content.segments.findIndex((s) => s.id === segmentId);
  const neighbor = content.segments[i + direction];
  if (i < 0 || !neighbor) return null;
  return {
    operation_type: 'move_segment',
    payload:
      direction < 0
        ? { segment_id: segmentId, before_segment_id: neighbor.id }
        : { segment_id: segmentId, after_segment_id: neighbor.id },
  };
}
