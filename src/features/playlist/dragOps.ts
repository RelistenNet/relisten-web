import type { NewId } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';

// A drop as one operation (docs/playlist-editing.md: positions are anchors).
// Pure, so tested (dragOps.test.ts); usePlaylistDrag reads sources and targets
// from the article's data attributes and calls this.

/** What's dragged: an entry (a track or a text block), or a whole segment (a section). */
export type DragSource = { kind: 'entry'; id: string } | { kind: 'segment'; id: string };

/** Where it's dropped. */
export type DropTarget =
  /**
   * Above or below a row: an entry, or a segment of prose alone (whose row id is
   * the segment's). Inside the row's group, or next to prose alone.
   */
  | { kind: 'row'; rowId: string; segmentId: string; edge: 'top' | 'bottom' }
  /** A gap between groups: a group of its own there. */
  | { kind: 'gap'; above?: string; below?: string };

export function dropOp(
  content: PlaylistContent,
  source: DragSource,
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
