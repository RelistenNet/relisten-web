import type { NewId } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';

// A drop as operations (docs/playlist-editing.md: positions are anchors). Pure, so
// tested (dragOps.test.ts); usePlaylistDrag reads sources and targets from the
// article's data attributes and calls this.

/**
 * What's dragged: an entry (a track, or a text block inside a group), a whole
 * segment (a section or group, by its header), or prose that's a segment's own
 * text: a section's comment, or text standing alone between groups. Prose moves
 * as text wherever it lands, changing how it's stored on the way.
 */
export type DragSource =
  | { kind: 'entry'; id: string }
  | { kind: 'segment'; id: string }
  | { kind: 'prose'; id: string; role: 'comment' | 'alone' };

/** Where it's dropped. */
export type DropTarget =
  /**
   * Above or below a row: an entry, or a segment of prose alone (whose row id is
   * the segment's). Inside the row's group, or next to prose alone.
   */
  | { kind: 'row'; rowId: string; segmentId: string; edge: 'top' | 'bottom' }
  /** A gap between groups: a group of its own there. */
  | { kind: 'gap'; above?: string; below?: string };

/** A drop's operations, applied together (one undo step). Empty when nothing would move. */
export function dropOps(
  content: PlaylistContent,
  source: DragSource,
  target: DropTarget,
  newId: NewId = newTypeId
): PlaylistOp[] {
  if (source.kind === 'prose') return moveProse(content, source, target, newId);
  const op = dropOp(content, source, target, newId);
  return op ? [op] : [];
}

/**
 * A segment's own text moved. Text alone moves as its segment between groups; into
 * a group it becomes a text entry there. A section's comment becomes text alone
 * between groups, or a text entry in a group; either way the section loses it.
 */
function moveProse(
  content: PlaylistContent,
  source: Extract<DragSource, { kind: 'prose' }>,
  target: DropTarget,
  newId: NewId
): PlaylistOp[] {
  const segment = content.segments.find((s) => s.id === source.id);
  const text = segment?.description;
  if (!segment || !text) return [];
  if (source.role === 'alone' && target.kind === 'gap') {
    const op = moveSegment(source.id, target);
    return op ? [op] : [];
  }
  if (target.kind === 'row' && target.segmentId === source.id) return [];
  const place: PlaylistOp =
    target.kind === 'gap'
      ? {
          operation_type: 'insert_segment',
          payload: {
            segment_id: newId('playlist_segment'),
            entries: [],
            description: text,
            ...(target.above
              ? { after_segment_id: target.above }
              : target.below
                ? { before_segment_id: target.below }
                : {}),
          },
        }
      : {
          operation_type: 'insert_entries',
          payload: {
            segment_id: target.segmentId,
            entries: [{ entry_id: newId('playlist_entry'), description: text }],
            ...(target.edge === 'top'
              ? { before_entry_id: target.rowId }
              : { after_entry_id: target.rowId }),
          },
        };
  // Placed first, so a gap anchored on the source segment still finds it.
  const unplace: PlaylistOp =
    source.role === 'alone'
      ? { operation_type: 'delete_segment', payload: { segment_id: source.id } }
      : { operation_type: 'update_segment', payload: { segment_id: source.id, description: null } };
  return [place, unplace];
}

export function dropOp(
  content: PlaylistContent,
  source: Exclude<DragSource, { kind: 'prose' }>,
  target: DropTarget,
  newId: NewId = newTypeId
): PlaylistOp | null {
  if (source.kind === 'segment') return moveSegment(source.id, target);
  if (target.kind === 'gap') {
    return {
      operation_type: 'move_entry',
      payload: {
        entry_id: source.id,
        destination: {
          new_segment_id: newId('playlist_segment'),
          ...(target.above
            ? { after_segment_id: target.above }
            : target.below
              ? { before_segment_id: target.below }
              : {}),
        },
      },
    };
  }
  if (target.rowId === source.id) return null;
  const proseOnly = target.rowId === target.segmentId;
  if (proseOnly) {
    // Next to prose alone: a group of its own on that side.
    return {
      operation_type: 'move_entry',
      payload: {
        entry_id: source.id,
        destination:
          target.edge === 'top'
            ? { new_segment_id: newId('playlist_segment'), before_segment_id: target.segmentId }
            : { new_segment_id: newId('playlist_segment'), after_segment_id: target.segmentId },
      },
    };
  }
  if (!content.segments.some((s) => s.id === target.segmentId)) return null;
  return {
    operation_type: 'move_entry',
    payload: {
      entry_id: source.id,
      destination:
        target.edge === 'top'
          ? { segment_id: target.segmentId, before_entry_id: target.rowId }
          : { segment_id: target.segmentId, after_entry_id: target.rowId },
    },
  };
}

function moveSegment(segmentId: string, target: DropTarget): PlaylistOp | null {
  if (target.kind === 'gap') {
    if (target.above === segmentId || target.below === segmentId) return null;
    return {
      operation_type: 'move_segment',
      payload: {
        segment_id: segmentId,
        ...(target.above
          ? { after_segment_id: target.above }
          : target.below
            ? { before_segment_id: target.below }
            : {}),
      },
    };
  }
  if (target.segmentId === segmentId) return null;
  return {
    operation_type: 'move_segment',
    payload:
      target.edge === 'top'
        ? { segment_id: segmentId, before_segment_id: target.segmentId }
        : { segment_id: segmentId, after_segment_id: target.segmentId },
  };
}
