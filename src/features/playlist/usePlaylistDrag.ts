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
// and drop (native drag events):
//
// - each block registers itself from its grip (`draggableBlock`, in a ref
//   callback): the element is the nearest [data-block], the row, or the
//   section/group around a header;
// - one monitor reports drags starting and ending, and drops;
// - once a drag starts, the editor lays out drop zones (flow.ts) where it can
//   land; each carries its target (data-drop-zone) and lights up under the
//   pointer. While dragging a track, every other card is a target too: dropped
//   on, the track joins that card's group.

type Source = { playlistDrag: DragSource };
const isSource = (data: Record<string | symbol, unknown>): data is Source =>
  typeof data.playlistDrag === 'object' && data.playlistDrag !== null;

type Target = { playlistTarget: DropTarget };
const isTarget = (data: Record<string | symbol, unknown>): data is Target =>
  typeof data.playlistTarget === 'object' && data.playlistTarget !== null;

const lit = (el: HTMLElement, on: boolean) =>
  on ? el.setAttribute('data-drop-over', '') : el.removeAttribute('data-drop-over');

const isField = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

/**
 * Makes the block around `handle` draggable, as `source`, until the returned
 * cleanup. While a text field inside it has focus, it isn't: a draggable element
 * takes mouse drags inside it, so the field couldn't select text.
 */
export function draggableBlock(handle: HTMLElement, source: DragSource, label: string) {
  const element = handle.closest<HTMLElement>('[data-block]');
  if (!element) return undefined;
  const typing = (e: FocusEvent) => {
    if (isField(e.target)) element.draggable = false;
  };
  const done = (e: FocusEvent) => {
    if (isField(e.target)) element.draggable = true;
  };
  element.addEventListener('focusin', typing);
  element.addEventListener('focusout', done);
  return combine(
    draggable({
      element,
      canDrag: () => {
        const active = document.activeElement;
        return !(isField(active) && element.contains(active));
      },
      getInitialData: (): Source => ({ playlistDrag: source }),
      // A small label under the pointer, not the browser's picture of the whole block.
      onGenerateDragPreview: ({ nativeSetDragImage }) =>
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({ x: '12px', y: '8px' }),
          render: ({ container }) => {
            const pill = document.createElement('div');
            pill.textContent = label;
            pill.className =
              'max-w-64 truncate rounded-full bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-primary shadow-lg ring-1 ring-accent';
            container.append(pill);
          },
        }),
      onDragStart: () => element.setAttribute('data-dragging', ''),
      onDrop: () => element.removeAttribute('data-dragging'),
    }),
    () => {
      element.removeEventListener('focusin', typing);
      element.removeEventListener('focusout', done);
      element.removeAttribute('data-dragging');
    }
  );
}

export function usePlaylistDrag({
  root,
  dragging,
  onDragChange,
  onDrop,
}: {
  root: RefObject<HTMLElement | null>;
  /** What's being dragged (the editor's state): its zones are laid out now. */
  dragging: DragSource | null;
  /** A drag starting (its source) or ending (null). */
  onDragChange: (source: DragSource | null) => void;
  onDrop: (source: DragSource, target: DropTarget) => void;
}) {
  const changed = useEffectEvent(onDragChange);
  const dropped = useEffectEvent(onDrop);

  // Drags starting, ending and dropping: once, for the editor's life.
  useEffect(
    () =>
      combine(
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
      ),
    []
  );

  // Where it can go: the zones laid out for this drag (rendered in the same commit
  // as `dragging`), and the other cards.
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
