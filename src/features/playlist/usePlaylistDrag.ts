'use client';

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/attach-closest-edge';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/extract-closest-edge';
import { type RefObject, useEffect, useEffectEvent } from 'react';
import type { DragSource, DropTarget } from './dragOps';

// Drag and drop for the editor (docs/playlist-editing.md), with Pragmatic drag
// and drop (native drag events). The article only marks its elements: rows
// (data-row-id, data-segment-id), sections (data-section-id) and gaps
// (data-gap, data-above, data-below); grips carry data-drag-kind/-id. This wires
// them up after each layout, and draws one drop line, moved directly while
// dragging, so nothing re-renders or reflows mid-drag. A block drags from anywhere
// on it (the grip just shows it can); a click still plays or opens it.

type Source = { playlistDrag: DragSource };
const isSource = (data: Record<string | symbol, unknown>): data is Source =>
  typeof data.playlistDrag === 'object' && data.playlistDrag !== null;

/** The slot's height (a dashed box between two cards, centered on the gap). */
const SLOT = 12;

export function usePlaylistDrag(
  root: RefObject<HTMLElement | null>,
  line: RefObject<HTMLElement | null>,
  /** Re-attach after each change to the layout… */
  layoutKey: unknown,
  /** …or to which text field is open (a block holding one can't be dragged). */
  fieldKey: string,
  onDrop: (source: DragSource, target: DropTarget) => void
) {
  const drop = useEffectEvent(onDrop);

  useEffect(() => {
    const container = root.current;
    if (!container) return;

    const show = (rect: DOMRect, y: number) => {
      const el = line.current;
      if (!el) return;
      el.hidden = false;
      el.style.top = `${y - SLOT / 2}px`;
      el.style.left = `${rect.left}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${SLOT}px`;
    };
    const hide = () => {
      if (line.current) line.current.hidden = true;
    };
    const over = (gap: HTMLElement, on: boolean) => {
      if (on) gap.setAttribute('data-drop-over', '');
      else gap.removeAttribute('data-drop-over');
    };

    const cleanups: (() => void)[] = [];

    for (const handle of container.querySelectorAll<HTMLElement>('[data-drag-kind]')) {
      const element = handle.closest<HTMLElement>('[data-section-id], [data-row-id]');
      const kind = handle.dataset.dragKind;
      const id = handle.dataset.dragId;
      if (!element || !id || (kind !== 'entry' && kind !== 'segment')) continue;
      // A draggable element takes mouse drags inside it, so a text field open in it
      // couldn't select text: while one is, the element isn't draggable.
      if (element.querySelector('textarea, input')) continue;
      cleanups.push(
        draggable({
          // The whole block drags, not just its grip: that's where people reach for it.
          element,
          getInitialData: (): Source => ({ playlistDrag: { kind, id } }),
          onDragStart: () => element.setAttribute('data-dragging', ''),
          onDrop: () => element.removeAttribute('data-dragging'),
        })
      );
    }

    for (const element of container.querySelectorAll<HTMLElement>('[data-row-id]')) {
      const rowId = element.dataset.rowId as string;
      const segmentId = element.dataset.segmentId as string;
      const target = { kind: 'row', rowId, segmentId } as const;
      const place = ({ self }: { self: { data: Record<string | symbol, unknown> } }) => {
        const rect = element.getBoundingClientRect();
        show(rect, extractClosestEdge(self.data) === 'top' ? rect.top - 3 : rect.bottom + 3);
      };
      cleanups.push(
        dropTargetForElements({
          element,
          canDrop: ({ source }) => isSource(source.data) && source.data.playlistDrag.id !== rowId,
          getData: ({ input }) =>
            attachClosestEdge({ ...target }, { element, input, allowedEdges: ['top', 'bottom'] }),
          onDragEnter: place,
          onDrag: place,
        })
      );
    }

    // A gap lights up itself; the slot isn't needed there.
    for (const element of container.querySelectorAll<HTMLElement>('[data-gap]')) {
      cleanups.push(
        dropTargetForElements({
          element,
          canDrop: ({ source }) => isSource(source.data),
          getData: () => ({
            kind: 'gap',
            above: element.dataset.above,
            below: element.dataset.below,
          }),
          onDragEnter: () => {
            hide();
            over(element, true);
          },
          onDragLeave: () => over(element, false),
          onDrop: () => over(element, false),
        })
      );
    }

    cleanups.push(
      monitorForElements({
        canMonitor: ({ source }) => isSource(source.data),
        // Hidden only once the pointer is over no target at all, not on every
        // crossing of the few pixels between two cards (which flickered).
        onDropTargetChange: ({ location }) => {
          if (!location.current.dropTargets.length) hide();
        },
        onDrop: ({ source, location }) => {
          hide();
          const target = location.current.dropTargets[0];
          if (!target || !isSource(source.data)) return;
          const data = target.data;
          if (data.kind === 'gap') {
            drop(source.data.playlistDrag, {
              kind: 'gap',
              above: data.above as string | undefined,
              below: data.below as string | undefined,
            });
          } else if (data.kind === 'row') {
            const edge = extractClosestEdge(data);
            if (edge !== 'top' && edge !== 'bottom') return;
            drop(source.data.playlistDrag, {
              kind: 'row',
              rowId: data.rowId as string,
              segmentId: data.segmentId as string,
              edge,
            });
          }
        },
      }),
      autoScrollWindowForElements()
    );

    return combine(...cleanups);
  }, [root, line, layoutKey, fieldKey]);
}
