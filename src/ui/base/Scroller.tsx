'use client';

import { RefObject, useEffect } from 'react';

/**
 * Centers a column's active row in the column's own scrolling list when the
 * column mounts. Only that list scrolls: scrollIntoView would scroll every
 * ancestor too, and where the column doesn't scroll on its own (the show
 * page's sources, below the tracks on a phone) it would jump the whole page.
 */
export default function Scroller({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const container = containerRef?.current;
    const row = container?.querySelector<HTMLElement>(`[data-is-active="true"]`);
    if (!container || !row) return;
    const list = scrollingAncestor(row, container);
    if (!list) return;
    const l = list.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    list.scrollBy({ top: r.top - l.top - (l.height - r.height) / 2, behavior: 'smooth' });
  }, [containerRef]);

  return null;
}

/** The nearest ancestor of `el`, up to `root`, that scrolls vertically right now. */
function scrollingAncestor(el: HTMLElement, root: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    if (node === root) break;
  }
  return null;
}
