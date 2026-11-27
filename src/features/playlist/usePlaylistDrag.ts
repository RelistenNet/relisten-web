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
import type { RowDrops } from './flow';
import type { DragSpec } from './PlaylistArticle';

// Drag and drop for the editor (docs/playlist-editing.md), with Pragmatic drag
// and drop (native drag events). Nothing in the layout changes for a drag:
//
// - what drags is marked `data-drag` (a row, or a section's or group's box, by
//   its label). Each is made draggable when a press lands on it, so nothing
//   re-registers as rows render, and a press in a text field never drags;
// - every row (and the space between rows) carries where a drop on it lands,
//   `data-drop` (flow.ts): by its top edge, its bottom edge, or a card's middle.
//   While a drag is over one, it gets `data-drop-edge` and `data-drop-label`, and
//   draws the line and label itself (PlaylistArticle), over the rows;
// - a drop that would change nothing (dropOps) gets no indicator and does nothing.

type Source = { playlistDrag: DragSource };
const isSource = (data: Record<string | symbol, unknown>): data is Source =>
  typeof data.playlistDrag === 'object' && data.playlistDrag !== null;

type Target = { playlistTarget: DropTarget; edge: keyof RowDrops; label: string };
const isTarget = (data: Record<string | symbol, unknown>): data is Target =>
  typeof data.playlistTarget === 'object' && data.playlistTarget !== null;

const isField = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement;

const parse = <T>(json: string | undefined): T | undefined => {
  try {
    return json ? (JSON.parse(json) as T) : undefined;
  } catch {
    return undefined;
  }
};

/** Which part of a row the pointer is over: its edges, or (if it has one) its middle. */
function edgeAt(element: Element, clientY: number, drops: RowDrops): keyof RowDrops | undefined {
  const { top, height } = element.getBoundingClientRect();
  const y = height ? (clientY - top) / height : 0.5;
  if (!drops.top && !drops.bottom) return drops.center && 'center';
  if (drops.center && y > 0.25 && y < 0.75) return 'center';
  const edge = y < 0.5 ? 'top' : 'bottom';
  return drops[edge] ? edge : drops.top ? 'top' : 'bottom';
}

function labelFor(source: DragSource, edge: keyof RowDrops, target: DropTarget, onCard: boolean) {
  if (edge === 'center' && onCard) return 'Group with this';
  if (target.kind === 'gap' && source.kind !== 'segment') return 'Move here, on its own';
  return 'Move here';
}

const show = (el: HTMLElement, data?: Target) => {
  if (data) {
    el.dataset.dropEdge = data.edge;
    el.dataset.dropLabel = data.label;
  } else {
    delete el.dataset.dropEdge;
    delete el.dataset.dropLabel;
  }
};

/** The `data-drag` elements from `element` outward (a row, then its box). */
function* dragAncestors(element: HTMLElement | null) {
  for (let el = element; el; el = el.parentElement?.closest<HTMLElement>('[data-drag]') ?? null)
    yield el;
}

/** Makes `element` draggable, as its `data-drag` says, until the returned cleanup. */
function makeDraggable(element: HTMLElement) {
  const spec = () => parse<DragSpec>(element.dataset.drag);
  return draggable({
    element,
    // Read when the drag starts, so it's always the row's current source and label.
    canDrag: () => !!spec() && !isField(document.activeElement),
    getInitialData: (): Source | Record<string, never> => {
      const s = spec();
      return s ? { playlistDrag: s.source } : {};
    },
    // A small label under the pointer, not the browser's picture of the whole block.
    onGenerateDragPreview: ({ nativeSetDragImage }) =>
      setCustomNativeDragPreview({
        nativeSetDragImage,
        getOffset: pointerOutsideOfPreview({ x: '12px', y: '8px' }),
        render: ({ container }) => {
          const pill = document.createElement('div');
          pill.textContent = spec()?.label || 'Moving';
          pill.className =
            'max-w-64 truncate rounded-full bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-primary shadow-lg ring-1 ring-accent';
          container.append(pill);
        },
      }),
    onDragStart: () => element.setAttribute('data-dragging', ''),
    onDrop: () => element.removeAttribute('data-dragging'),
  });
}

export function usePlaylistDrag({
  root,
  dragging,
  canDrop,
  onDragChange,
  onDrop,
}: {
  root: RefObject<HTMLElement | null>;
  /** What's being dragged (the editor's state): drop targets are live while it is. */
  dragging: DragSource | null;
  /** Whether dropping there would change anything (dropOps). */
  canDrop: (source: DragSource, target: DropTarget) => boolean;
  /** A drag starting (its source) or ending (null). */
  onDragChange: (source: DragSource | null) => void;
  onDrop: (source: DragSource, target: DropTarget) => void;
}) {
  const changed = useEffectEvent(onDragChange);
  const dropped = useEffectEvent(onDrop);
  const allowed = useEffectEvent(canDrop);

  // What drags: made draggable when a press lands on it (before the browser decides
  // to start a drag), and never while the press is in a text field.
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const registered = new Map<HTMLElement, () => void>();
    const press = (e: PointerEvent) => {
      // Forget what's left the page.
      for (const [el, cleanup] of registered)
        if (!el.isConnected) {
          cleanup();
          registered.delete(el);
        }
      const target = e.target instanceof Element ? e.target : null;
      const element = target?.closest<HTMLElement>('[data-drag]') ?? null;
      if (!element) return;
      if (isField(target)) {
        // Selecting text: nothing around the field drags.
        for (const el of dragAncestors(element)) el.draggable = false;
        return;
      }
      for (const el of dragAncestors(element)) if (registered.has(el)) el.draggable = true;
      if (!registered.has(element)) registered.set(element, makeDraggable(element));
    };
    container.addEventListener('pointerdown', press, true);
    return () => {
      container.removeEventListener('pointerdown', press, true);
      for (const cleanup of registered.values()) cleanup();
    };
  }, [root]);

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

  // Where it can go, while a drag is on: every row and space that says so, read
  // fresh for each drag.
  const active = dragging !== null;
  useEffect(() => {
    const container = root.current;
    if (!container || !active) return;
    const cleanups: (() => void)[] = [];
    for (const element of container.querySelectorAll<HTMLElement>('[data-drop]')) {
      const drops = parse<RowDrops>(element.dataset.drop);
      if (!drops) continue;
      const onCard = !!element.querySelector('[data-card]');
      cleanups.push(
        dropTargetForElements({
          element,
          canDrop: ({ source }) => isSource(source.data),
          getData: ({ input, source }): Target | Record<string, never> => {
            if (!isSource(source.data)) return {};
            const edge = edgeAt(element, input.clientY, drops);
            const target = edge && drops[edge];
            if (!edge || !target || !allowed(source.data.playlistDrag, target)) return {};
            return {
              playlistTarget: target,
              edge,
              label: labelFor(source.data.playlistDrag, edge, target, onCard),
            };
          },
          onDrag: ({ self }) => show(element, isTarget(self.data) ? self.data : undefined),
          onDragLeave: () => show(element),
          onDrop: () => show(element),
        })
      );
    }
    return combine(...cleanups);
  }, [root, active]);
}
