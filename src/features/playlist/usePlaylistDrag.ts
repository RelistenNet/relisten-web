'use client';

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { type RefObject, useEffect, useEffectEvent } from 'react';
import type { DragSource, DropTarget } from './dragOps';

// Drag and drop for the editor (docs/playlist-editing.md), with Pragmatic drag
// and drop (native drag events). The article marks its elements; this wires them:
//
// - blocks drag from anywhere on them (data-drag-kind/-id on their grip; the
//   element is the row or the section/group around it);
// - once a drag starts, the editor lays out drop zones (flow.ts) where it can
//   land; each carries its target (data-drop-zone) and lights up under the pointer;
// - while dragging a track, every other card is a target too: dropped on, the
//   track joins that card's group.

type Source = { playlistDrag: DragSource };
const isSource = (data: Record<string | symbol, unknown>): data is Source =>
  typeof data.playlistDrag === 'object' && data.playlistDrag !== null;

type Target = { playlistTarget: DropTarget };
const isTarget = (data: Record<string | symbol, unknown>): data is Target =>
  typeof data.playlistTarget === 'object' && data.playlistTarget !== null;

const lit = (el: HTMLElement, on: boolean) =>
  on ? el.setAttribute('data-drop-over', '') : el.removeAttribute('data-drop-over');

export function usePlaylistDrag({
  root,
  layoutKey,
  fieldKey,
  dragging,
  onDragChange,
  onDrop,
}: {
  root: RefObject<HTMLElement | null>;
  /** Re-attach draggables after each change to the layout… */
  layoutKey: unknown;
  /** …or to which text field is open (a block holding one can't be dragged). */
  fieldKey: string;
  /** What's being dragged (the editor's state): its zones are laid out now. */
  dragging: DragSource | null;
  /** A drag starting (its source) or ending (null). */
  onDragChange: (source: DragSource | null) => void;
  onDrop: (source: DragSource, target: DropTarget) => void;
}) {
  const changed = useEffectEvent(onDragChange);
  const dropped = useEffectEvent(onDrop);

  // What can be dragged.
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const cleanups: (() => void)[] = [];
    for (const handle of container.querySelectorAll<HTMLElement>('[data-drag-kind]')) {
      const element = handle.closest<HTMLElement>('[data-section-id], [data-row-id]');
      const { dragKind: kind, dragId: id, dragRole: role } = handle.dataset;
      const source: DragSource | null = !id
        ? null
        : kind === 'entry' || kind === 'segment'
          ? { kind, id }
          : kind === 'prose' && (role === 'comment' || role === 'alone')
            ? { kind, id, role }
            : null;
      if (!element || !source) continue;
      // A draggable element takes mouse drags inside it, so a text field open in it
      // couldn't select text: while one is, the element isn't draggable.
      if (element.querySelector('textarea, input')) continue;
      cleanups.push(
        draggable({
          element,
          getInitialData: (): Source => ({ playlistDrag: source }),
          // A small label under the pointer, not the browser's picture of the whole block.
          onGenerateDragPreview: ({ nativeSetDragImage }) =>
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: pointerOutsideOfPreview({ x: '12px', y: '8px' }),
              render: ({ container }) => {
                const pill = document.createElement('div');
                pill.textContent = handle.dataset.dragLabel || 'Moving';
                pill.className =
                  'max-w-64 truncate rounded-full bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-primary shadow-lg ring-1 ring-accent';
                container.append(pill);
              },
            }),
          onDragStart: () => element.setAttribute('data-dragging', ''),
          onDrop: () => element.removeAttribute('data-dragging'),
        })
      );
    }
    cleanups.push(
      monitorForElements({
        canMonitor: ({ source }) => isSource(source.data),
        onDragStart: ({ source }) => {
          if (isSource(source.data)) changed(source.data.playlistDrag);
        },
        onDrop: ({ source, location }) => {
          changed(null);
          const target = location.current.dropTargets[0];
          if (target && isSource(source.data) && isTarget(target.data))
            dropped(source.data.playlistDrag, target.data.playlistTarget);
        },
      }),
      autoScrollWindowForElements()
    );
    return combine(...cleanups);
  }, [root, layoutKey, fieldKey]);

  // Where it can go: the zones laid out for this drag, and the other cards.
  const dragKey = dragging ? `${dragging.kind}:${dragging.id}` : '';
  useEffect(() => {
    const container = root.current;
    if (!container || !dragKey) return;
    const cleanups: (() => void)[] = [];
    const target = (element: HTMLElement, data: DropTarget) =>
      cleanups.push(
        dropTargetForElements({
          element,
          getData: (): Target => ({ playlistTarget: data }),
          onDragEnter: () => lit(element, true),
          onDragLeave: () => lit(element, false),
          onDrop: () => lit(element, false),
        })
      );
    for (const zone of container.querySelectorAll<HTMLElement>('[data-drop-zone]')) {
      try {
        target(zone, JSON.parse(zone.dataset.dropZone ?? '') as DropTarget);
      } catch {
        // A zone without a target: skip it.
      }
    }
    if (dragKey.startsWith('entry:')) {
      const draggedId = dragKey.slice('entry:'.length);
      for (const card of container.querySelectorAll<HTMLElement>('[data-card]')) {
        const rowId = card.dataset.rowId;
        const segmentId = card.dataset.segmentId;
        if (!rowId || !segmentId || rowId === draggedId) continue;
        // Dropped on a card: into its group, right after it.
        target(card, { kind: 'row', rowId, segmentId, edge: 'bottom' });
      }
    }
    return combine(...cleanups);
  }, [root, dragKey]);
}
