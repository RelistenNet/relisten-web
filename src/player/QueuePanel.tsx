'use client';

import { GripVerticalIcon, ListMusicIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import cn from '@/lib/cn';
import { durationToHHMMSS } from '@/lib/utils';
import RowHeader from '@/ui/base/RowHeader';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import { jumpTo, moveInQueue, removeFromQueue } from './commands';
import { useIsPlaying, useQueue } from './hooks';
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
    <Popover>
      <PopoverTrigger
        aria-label={count ? `Queue, ${count} up next` : 'Queue'}
        className="
          relative flex w-11 shrink-0 items-center justify-center self-stretch text-text-muted
          hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-accent data-popup-open:text-text-primary lg:w-10
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
        align="end"
        sideOffset={4}
        // The arrow meets the 2px ring and takes the header's colour; the
        // content (positioned, later) covers its lower half.
        arrowClassName="border-t-2 border-l-2 bg-column-subheader data-[side=bottom]:-top-2 data-[side=left]:-right-2 data-[side=right]:-left-2 data-[side=top]:-bottom-2"
        className="
          w-[min(24rem,calc(100vw-1rem))] gap-0 p-0 shadow-2xl ring-2 dark:shadow-black/60
        "
      >
        <div
          className="
            relative flex max-h-[min(36rem,calc(var(--available-height)-0.5rem))] flex-col
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
  const { played, current, upNext, rest } = useMemo(() => queueView(queue), [queue]);
  const currentRow = useRef<HTMLLIElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Open with the current row in the middle: earlier tracks above, what's next below.
  // A frame later, once the popover has its size.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const row = currentRow.current;
      const box = scroller.current;
      if (row && box) box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
    });
    return () => cancelAnimationFrame(frame);
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

  const showOf = (item: QueueItem) =>
    [item.artistName, formatDate(item.date), item.venue].filter(Boolean).join(' · ');

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
          {played.map((item) => (
            <QueueRow
              key={item.key}
              item={item}
              number={numbers.get(item.key)}
              show={showOf(item)}
              played
            />
          ))}
          <QueueRow
            ref={currentRow}
            item={current}
            number={position}
            show={showOf(current)}
            current
          />
        </ol>
        {upNext.length > 0 && (
          <>
            <RowHeader>
              Up next <span className="tabular-nums">{durationToHHMMSS(total(upNext))}</span>
            </RowHeader>
            <NextUpList items={upNext} showOf={showOf} />
            {rest.length > 0 && <RowHeader>Then</RowHeader>}
          </>
        )}
        {rest.length > 0 && (
          <ol role="list" className="m-0 list-none p-0">
            {rest.map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                number={numbers.get(item.key)}
                show={showOf(item)}
              />
            ))}
          </ol>
        )}
        {!upNext.length && !rest.length && <RowHeader>Last track</RowHeader>}
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

/** A row: picking it plays it. */
function QueueRow({
  ref,
  item,
  number,
  show,
  current = false,
  played = false,
  before,
  after,
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
  before?: React.ReactNode;
  after?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <li
      ref={ref}
      className={cn(
        `
          group relative m-0 flex min-h-12 items-center border-b border-hairline pr-1
          hover:bg-surface-hover lg:min-h-10
        `,
        current && 'bg-accent/10 hover:bg-accent/15',
        className
      )}
      style={style}
    >
      {current && <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />}
      {before}
      <button
        type="button"
        onClick={() => jumpTo(item.key)}
        aria-current={current || undefined}
        className={cn(
          `
            flex min-w-0 flex-1 items-center gap-3 self-stretch py-1.5 pr-2 text-left
            leading-tight tabular-nums focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-accent
          `,
          before ? 'pl-1' : 'pl-3',
          played && 'text-text-muted'
        )}
      >
        {!before && (
          <span className="flex w-5 shrink-0 justify-end text-xs text-text-muted">
            {current ? <PlayingBars /> : number}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate', current && 'font-medium text-accent')}>
            {item.title}
          </span>
          {show && <span className="block truncate text-xxs text-text-muted">{show}</span>}
        </span>
        {item.duration ? (
          <span className="shrink-0 text-xs text-text-muted">
            {durationToHHMMSS(item.duration)}
          </span>
        ) : null}
      </button>
      {after}
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

/** Next up: drag a handle (or focus it and use the arrow keys) to reorder; remove an entry. */
function NextUpList({
  items,
  showOf,
}: {
  items: QueueItem[];
  showOf: (item: QueueItem) => string;
}) {
  const listRef = useRef<HTMLOListElement>(null);
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
  }, [items]);

  const keys = items.map((i) => i.key);

  /** Move `key` to position `to` (in the list without it). */
  const moveTo = (key: string, to: number) => {
    const others = keys.filter((k) => k !== key);
    moveInQueue(key, to === 0 ? 'start' : others[to - 1]);
    const item = items.find((i) => i.key === key);
    setAnnouncement(`${item?.title ?? 'Track'} moved to position ${to + 1} of ${items.length}.`);
  };

  const onKeyDown = (e: React.KeyboardEvent, key: string, index: number) => {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
    if (to === null || to < 0 || to >= items.length) return;
    e.preventDefault();
    focusKey.current = key;
    moveTo(key, to);
  };

  const onPointerDown = (e: React.PointerEvent, key: string, index: number) => {
    if (e.button !== 0 || !listRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rects = [...listRef.current.children].map((el) => el.getBoundingClientRect());
    setDrag({ key, from: index, to: index, startY: e.clientY, dy: 0, rects });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const dragged = drag.rects[drag.from];
    const center = dragged.top + dragged.height / 2 + dy;
    // The new position: how many other rows' middles are above the dragged row's middle.
    const to = drag.rects.filter((r, i) => i !== drag.from && r.top + r.height / 2 < center).length;
    setDrag({ ...drag, dy, to });
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.to !== drag.from) moveTo(drag.key, drag.to);
    setDrag(null);
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

  return (
    <>
      <ol ref={listRef} role="list" className="m-0 list-none p-0">
        {items.map((item, index) => {
          const dragging = drag?.key === item.key;
          return (
            <QueueRow
              key={item.key}
              className={cn(
                'relative translate-y-(--shift)',
                dragging
                  ? 'z-10 bg-surface-raised shadow-lg dark:shadow-none'
                  : drag && 'transition-transform duration-150'
              )}
              style={{ '--shift': `${shift(index)}px` } as React.CSSProperties}
              item={item}
              show={showOf(item)}
              before={
                <button
                  type="button"
                  ref={(el) => {
                    if (el) handles.current.set(item.key, el);
                    else handles.current.delete(item.key);
                  }}
                  aria-label={`Reorder ${item.title}`}
                  aria-describedby="queue-reorder-hint"
                  onKeyDown={(e) => onKeyDown(e, item.key, index)}
                  onPointerDown={(e) => onPointerDown(e, item.key, index)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  className={cn(ICON_BUTTON, 'cursor-grab touch-none active:cursor-grabbing')}
                >
                  <GripVerticalIcon size={16} className="shrink-0" aria-hidden />
                  <TouchTarget />
                </button>
              }
              after={
                <button
                  type="button"
                  aria-label={`Remove ${item.title} from Next up`}
                  onClick={() => removeFromQueue(item.key)}
                  className={ICON_BUTTON}
                >
                  <XIcon size={16} className="shrink-0" aria-hidden />
                  <TouchTarget />
                </button>
              }
            />
          );
        })}
      </ol>
      <p id="queue-reorder-hint" className="sr-only">
        Drag, or use the up and down arrow keys, to change the order.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
