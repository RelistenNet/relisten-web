'use client';

import { CheckIcon, CircleAlertIcon, GripVerticalIcon, ListMusicIcon, XIcon } from 'lucide-react';
import driver from '@switz/driver';
import { useEffect, useMemo, useRef, useState } from 'react';
import cn from '@/lib/cn';
import { durationToHHMMSS } from '@/lib/utils';
import RowHeader from '@/ui/base/RowHeader';
import Tooltip from '@/ui/base/Tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import { jumpTo, moveInQueue, removeFromQueue } from './commands';
import { useIsPlaying, useQueue, useTrackStatuses } from './hooks';
import { queueView, type QueueItem } from './queue/model';

// The queue: a popover off the player bar's queue button, as plain rows like a
// show's track list. Played, now playing, Next up (drag or arrow keys to
// reorder, remove), then the rest of the show or song list. Picking a row plays it.

/** A 48×48 touch target on a smaller button (coarse pointers only). */
const TouchTarget = () => (
  <span
    className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
    aria-hidden
  />
);

const ICON_BUTTON = `
  relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted
  hover:bg-surface-hover hover:text-text-primary focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-accent
`;

/** The player bar's queue button, with the popover it opens. */
export default function QueueButton() {
  const count = useQueue((q) => q.upNext.length);

  return (
    <Popover align="end" sideOffset={4}>
      <PopoverTrigger
        aria-label={count ? `Queue, ${count} up next` : 'Queue'}
        className="
          relative flex w-11 shrink-0 items-center justify-center self-stretch text-text-muted
          hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-accent aria-expanded:text-text-primary lg:w-10
        "
      >
        <ListMusicIcon size={22} className="shrink-0" aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="
              absolute top-1.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full
              bg-accent px-1 text-xxs font-semibold text-surface tabular-nums
            "
          >
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        aria-label="Queue"
        // The arrow sits on the panel's edge: up 2px to meet the ring, in the
        // header's colour; the content (positioned, later) covers its lower half.
        arrowClassName="-translate-y-0.5 border-t-2 border-l-2 bg-column-subheader"
        className="
          w-[min(28rem,calc(100vw-1rem))] gap-0 p-0 shadow-2xl ring-2 dark:shadow-black/60
        "
      >
        <div
          className="
            relative flex max-h-[min(36rem,calc(100dvh-5rem))] flex-col
            overflow-hidden rounded-lg
          "
        >
          <QueueContents />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const total = (items: QueueItem[]) => items.reduce((sum, i) => sum + (i.duration ?? 0), 0);

const formatDate = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
};

function QueueContents() {
  const queue = useQueue((q) => q);
  const view = useMemo(() => queueView(queue), [queue]);
  const { played, current, upNext, rest } = view;
  // Every row, in the order listed: one list for dragging, across the sections.
  const rows = useMemo(
    () => [...played, ...(current ? [current] : []), ...upNext, ...rest],
    [played, current, upNext, rest]
  );
  const reorder = useReorder(rows);
  const scroller = useRef<HTMLDivElement>(null);

  // Open with the current row in the middle: earlier tracks above, what's next below.
  // A frame later, once the popover has its size.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = scroller.current;
      const row = box?.querySelector<HTMLElement>('li:has([aria-current])');
      if (row && box) box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
    });
    return () => cancelAnimationFrame(frame);
    // Only on open.
  }, []);

  if (!current) {
    return (
      <p className="px-4 py-6 text-center text-sm text-text-muted">
        Nothing playing. Add tracks with Play next or Add to queue.
      </p>
    );
  }

  // Track numbers are positions in the show or song list.
  const numbers = new Map(queue.context?.items.map((item, i) => [item.key, i + 1]));
  const count = queue.context?.items.length ?? 0;
  const position = numbers.get(current.key);
  const left = total([...upNext, ...rest]);
  // One playing from Next up can't move (it isn't in a list); it can be removed (skipped).
  const fixed = queue.current?.from === 'upNext' ? current.key : null;

  const showOf = (item: QueueItem) =>
    [item.artistName, formatDate(item.date), item.venue].filter(Boolean).join(' · ');

  const indexOf = new Map(rows.map((r, i) => [r.key, i]));
  const row = (item: QueueItem, kind: 'played' | 'current' | 'upNext' | 'rest') => {
    const i = indexOf.get(item.key) ?? 0;
    return (
      <QueueRow
        key={item.key}
        ref={reorder.rowRef(item.key)}
        {...reorder.rowProps(item.key, i)}
        item={item}
        number={kind === 'upNext' ? undefined : numbers.get(item.key)}
        show={showOf(item)}
        current={kind === 'current'}
        played={kind === 'played'}
        actions={
          <>
            {item.key !== fixed && (
              <button
                type="button"
                {...reorder.handleProps(item.key, i)}
                aria-label={`Reorder ${item.title}`}
                aria-describedby="queue-reorder-hint"
                className={cn(ICON_BUTTON, 'cursor-grab touch-none active:cursor-grabbing')}
              >
                <GripVerticalIcon size={16} className="shrink-0" aria-hidden />
                <TouchTarget />
              </button>
            )}
            <button
              type="button"
              aria-label={
                kind === 'current' ? `Remove ${item.title} and skip it` : `Remove ${item.title}`
              }
              onClick={() => removeFromQueue(item.key)}
              className={ICON_BUTTON}
            >
              <XIcon size={16} className="shrink-0" aria-hidden />
              <TouchTarget />
            </button>
          </>
        }
      />
    );
  };

  return (
    <>
      <div
        className="
          flex shrink-0 items-center gap-3 border-b-2 border-hairline bg-column-subheader px-3
          py-2 text-xxs font-semibold tracking-wide text-column-subheader-text uppercase
          tabular-nums
        "
      >
        {position && count > 0 && (
          <span>
            Track {position} of {count}
          </span>
        )}
        {left > 0 && <span>{durationToHHMMSS(left)} left</span>}
        {upNext.length > 0 && <span className="text-accent">{upNext.length} up next</span>}
      </div>
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ol role="list" className="m-0 list-none p-0">
          {played.map((item) => row(item, 'played'))}
          {row(current, 'current')}
        </ol>
        {upNext.length > 0 && (
          <>
            <RowHeader>
              Up next <span className="tabular-nums">{durationToHHMMSS(total(upNext))}</span>
            </RowHeader>
            <ol role="list" className="m-0 list-none p-0">
              {upNext.map((item) => row(item, 'upNext'))}
            </ol>
            {rest.length > 0 && <RowHeader>Then</RowHeader>}
          </>
        )}
        {rest.length > 0 && (
          <ol role="list" className="m-0 list-none p-0">
            {rest.map((item) => row(item, 'rest'))}
          </ol>
        )}
        {!upNext.length && !rest.length && <RowHeader>Last track</RowHeader>}
        <p id="queue-reorder-hint" className="sr-only">
          Drag, or use the up and down arrow keys, to change the order.
        </p>
        <p aria-live="polite" className="sr-only">
          {reorder.announcement}
        </p>
      </div>
    </>
  );
}

/** Bouncing bars on the current row while it plays. */
function PlayingBars() {
  const playing = useIsPlaying();
  return (
    <span className="flex h-3 items-end gap-px" aria-label={playing ? 'Playing' : 'Paused'}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={cn(
            'w-[3px] rounded-[1px] bg-accent',
            playing ? 'h-full origin-bottom animate-[queue-bars_0.9s_ease-in-out_infinite]' : 'h-1'
          )}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
      <style>{`@keyframes queue-bars{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
    </span>
  );
}

/** Whether an entry is loaded for gapless playback: an icon, in a fixed column. */
function LoadState({ entryKey, hidden }: { entryKey: string; hidden: boolean }) {
  const status = useTrackStatuses()[entryKey];
  const load = driver({
    states: {
      isHidden: hidden,
      isReady: status === 'LOADED',
      isLoading: status === 'LOADING',
      isFailed: status === 'ERROR',
      isIdle: true,
    },
    derived: {
      label: {
        isReady: 'Gapless Ready',
        isLoading: 'Loading Gapless',
        isFailed: 'Failed To Load',
      },
      icon: {
        isReady: <CheckIcon size={14} strokeWidth={2.5} className="text-emerald-500" aria-hidden />,
        isLoading: <span className="size-2 rounded-full bg-amber-500" aria-hidden />,
        isFailed: (
          <CircleAlertIcon size={14} strokeWidth={2.5} className="text-red-500" aria-hidden />
        ),
      },
    },
  });

  return (
    <span className="flex w-4 shrink-0 justify-center">
      {load.label && (
        <Tooltip
          content={load.label}
          align="top"
          className="flex size-4 items-center justify-center"
        >
          {load.icon}
          <span className="sr-only">{load.label}</span>
        </Tooltip>
      )}
    </span>
  );
}

/**
 * A row: picking it plays it. Every row has the same columns, so they line
 * up across sections: number (or playing bars), title and show, load state,
 * duration, then room for the drag handle and remove button.
 */
function QueueRow({
  ref,
  item,
  number,
  show,
  current = false,
  played = false,
  actions,
  className,
  style,
}: {
  ref?: React.Ref<HTMLLIElement>;
  item: QueueItem;
  /** Its position in the show or song list (none for Next up). */
  number?: number;
  /** Artist, date and venue. */
  show: string;
  current?: boolean;
  /** Already played: dimmed. */
  played?: boolean;
  /** The drag handle and remove button, for entries still to come. */
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <li
      ref={ref}
      className={cn(
        `
          relative m-0 flex min-h-12 items-center border-b border-hairline
          hover:bg-surface-hover lg:min-h-10
        `,
        current && 'bg-accent/10 hover:bg-accent/15',
        className
      )}
      style={style}
    >
      {current && <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />}
      <button
        type="button"
        onClick={() => jumpTo(item.key)}
        aria-current={current || undefined}
        className={cn(
          `
            flex min-w-0 flex-1 items-center gap-2 self-stretch py-1.5 text-left leading-tight
            tabular-nums focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-accent
          `,
          played && 'text-text-muted'
        )}
      >
        <span className="flex w-7 shrink-0 justify-end text-xs text-text-muted">
          {current ? <PlayingBars /> : number}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate', current && 'font-medium text-accent')}>
            {item.title}
          </span>
          <span className="block truncate text-xxs text-text-muted">{show}</span>
        </span>
        <LoadState entryKey={item.key} hidden={played} />
        <span className="w-12 shrink-0 text-right text-xs text-text-muted">
          {item.duration ? durationToHHMMSS(item.duration) : null}
        </span>
      </button>
      <span className="flex w-[4.25rem] shrink-0 items-center justify-end pr-1">{actions}</span>
    </li>
  );
}

type Drag = {
  key: string;
  from: number;
  to: number;
  startY: number;
  dy: number;
  rects: DOMRect[];
};

/**
 * Reordering the panel's rows, across its sections: drag a row's handle, or
 * focus it and use the arrow keys. A row lands just after the row above it;
 * move() decides which list that puts it in.
 */
function useReorder(rows: QueueItem[]) {
  const rowEls = useRef(new Map<string, HTMLLIElement>());
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const [drag, setDrag] = useState<Drag | null>(null);
  /** The handle to refocus once a keyboard move has re-rendered the list. */
  const focusKey = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // Keep focus on an entry's handle after a keyboard move re-renders the list.
  useEffect(() => {
    if (!focusKey.current) return;
    handles.current.get(focusKey.current)?.focus();
    focusKey.current = null;
  }, [rows]);

  /** Move `key` to position `to` (in the list without it). */
  const moveTo = (key: string, to: number) => {
    const others = rows.filter((r) => r.key !== key);
    moveInQueue(key, to === 0 ? null : others[to - 1].key);
    const item = rows.find((r) => r.key === key);
    setAnnouncement(`${item?.title ?? 'Track'} moved to position ${to + 1} of ${rows.length}.`);
  };

  /** How far a row moves while another is dragged past it. */
  const shift = (index: number) => {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    const h = drag.rects[drag.from].height;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -h;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return h;
    return 0;
  };

  return {
    announcement,
    rowRef: (key: string) => (el: HTMLLIElement | null) => {
      if (el) rowEls.current.set(key, el);
      else rowEls.current.delete(key);
    },
    // Rows only get a transform while dragging: an idle transform would break
    // the CSS-anchored tooltips inside them.
    rowProps: (key: string, index: number) =>
      drag
        ? {
            className: cn(
              'relative translate-y-(--shift)',
              drag.key === key
                ? 'z-10 bg-surface-raised shadow-lg dark:shadow-none'
                : 'transition-transform duration-150'
            ),
            style: { '--shift': `${shift(index)}px` } as React.CSSProperties,
          }
        : {},
    handleProps: (key: string, index: number) => ({
      ref: (el: HTMLButtonElement | null) => {
        if (el) handles.current.set(key, el);
        else handles.current.delete(key);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
        if (to === null || to < 0 || to >= rows.length) return;
        e.preventDefault();
        focusKey.current = key;
        moveTo(key, to);
      },
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const els = rows.map((r) => rowEls.current.get(r.key));
        if (els.some((el) => !el)) return;
        const rects = els.map((el) => el?.getBoundingClientRect() ?? new DOMRect());
        setDrag({ key, from: index, to: index, startY: e.clientY, dy: 0, rects });
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!drag) return;
        const dy = e.clientY - drag.startY;
        const dragged = drag.rects[drag.from];
        const center = dragged.top + dragged.height / 2 + dy;
        // The new position: how many other rows' middles are above the dragged row's middle.
        const to = drag.rects.filter(
          (r, i) => i !== drag.from && r.top + r.height / 2 < center
        ).length;
        setDrag({ ...drag, dy, to });
      },
      onPointerUp: () => {
        if (!drag) return;
        if (drag.to !== drag.from) moveTo(drag.key, drag.to);
        setDrag(null);
      },
      onPointerCancel: () => setDrag(null),
    }),
  };
}
