'use client';

import { Drawer } from '@base-ui/react/drawer';
import { GripVerticalIcon, ListMusicIcon, Volume2Icon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import cn from '@/lib/cn';
import { durationToHHMMSS } from '@/lib/utils';
import { jumpTo, moveInQueue, removeFromQueue } from './commands';
import { useIsPlaying, useQueue } from './hooks';
import { upcoming, type QueueItem } from './queue/model';

// The queue: a bottom sheet on phones (swipe down to close), a panel on the
// right on desktop. Now playing, Next up (drag or arrow keys to reorder,
// remove), then the rest of the show or song list. Picking an entry plays it.

const DESKTOP = '(min-width: 64rem)';

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false
  );
}

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

/** The player bar's queue button, with the panel it opens. */
export default function QueueButton() {
  const count = useQueue((q) => q.upNext.length);
  const isDesktop = useIsDesktop();

  return (
    <Drawer.Root swipeDirection={isDesktop ? 'right' : 'down'}>
      <Drawer.Trigger
        aria-label={count ? `Queue, ${count} up next` : 'Queue'}
        className="
          relative flex w-11 shrink-0 items-center justify-center self-stretch text-text-muted
          hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-accent lg:w-10
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
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className="
            fixed inset-0 z-50 bg-black/30 transition-opacity duration-300
            data-ending-style:opacity-0 data-starting-style:opacity-0
          "
        />
        {/* The viewport carries swipe-to-close and touch scroll locking. */}
        <Drawer.Viewport className="fixed inset-0 z-50">
          <Drawer.Popup
            className="
              fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh]
              translate-y-(--drawer-swipe-movement-y) flex-col rounded-t-2xl bg-surface
              pb-[env(safe-area-inset-bottom)] text-text-primary shadow-xl ring-1 ring-hairline
              transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none
              data-ending-style:translate-y-full data-starting-style:translate-y-full
              lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:max-h-none lg:w-[26rem]
              lg:translate-x-(--drawer-swipe-movement-x) lg:translate-y-0 lg:rounded-none lg:pb-0
              lg:data-ending-style:translate-x-full
              lg:data-ending-style:translate-y-0 lg:data-starting-style:translate-x-full
              lg:data-starting-style:translate-y-0 dark:shadow-none
            "
          >
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-hairline lg:hidden"
              aria-hidden
            />
            <div className="flex shrink-0 items-center gap-2 border-b border-hairline py-2 pr-2 pl-4">
              <Drawer.Title className="flex-1 text-base font-semibold">Queue</Drawer.Title>
              <Drawer.Close aria-label="Close the queue" className={ICON_BUTTON}>
                <XIcon size={16} className="shrink-0" aria-hidden />
                <TouchTarget />
              </Drawer.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              <QueueContents />
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function QueueContents() {
  const queue = useQueue((q) => q);
  const { current, upNext, label, rest } = useMemo(() => upcoming(queue), [queue]);

  if (!current) {
    return (
      <p className="px-4 py-8 text-center text-base/6 text-pretty text-text-muted sm:text-sm/6">
        Nothing is playing. Use Play next or Add to queue on any track to build a queue.
      </p>
    );
  }

  return (
    <>
      <Section title="Now playing">
        <ol role="list" className="m-0 list-none p-0">
          <QueueRow item={current} current />
        </ol>
      </Section>
      {upNext.length > 0 && (
        <Section title="Next up">
          <NextUpList items={upNext} />
        </Section>
      )}
      {rest.length > 0 && (
        <Section title={label ? `Next from ${label}` : 'Next'}>
          <ol role="list" className="m-0 list-none p-0">
            {rest.map((item) => (
              <QueueRow key={item.key} item={item} />
            ))}
          </ol>
        </Section>
      )}
      {!upNext.length && !rest.length && (
        <p className="px-4 pt-4 text-base/6 text-text-muted sm:text-sm/6">
          Nothing after this track.
        </p>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-4">
      <h3 className="truncate px-4 pb-1 text-sm/6 font-medium text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

const meta = (item: QueueItem) =>
  [item.artistName, item.date, item.venue].filter(Boolean).join(' · ');

/** An entry: picking it plays it. */
function QueueRow({
  item,
  current = false,
  before,
  after,
  className,
  style,
}: {
  item: QueueItem;
  current?: boolean;
  before?: React.ReactNode;
  after?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const playing = useIsPlaying() && current;
  return (
    <li
      className={cn('m-0 flex items-center gap-1 px-2 hover:bg-surface-hover', className)}
      style={style}
    >
      {before}
      <button
        type="button"
        onClick={() => jumpTo(item.key)}
        aria-current={current || undefined}
        className="
          flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2.5 text-left
          focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent
          sm:py-2
        "
      >
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate text-base/6 font-medium sm:text-sm/5',
              current && 'text-accent'
            )}
          >
            {item.title}
          </div>
          <div className="truncate text-sm/5 text-text-muted sm:text-[0.8125rem]/5">
            {meta(item)}
          </div>
        </div>
        {playing && <Volume2Icon size={16} className="shrink-0 text-accent" aria-label="Playing" />}
        {item.duration ? (
          <div className="shrink-0 text-sm/5 text-text-muted tabular-nums">
            {durationToHHMMSS(item.duration)}
          </div>
        ) : null}
      </button>
      {after}
    </li>
  );
}

type Drag = { key: string; from: number; to: number; startY: number; dy: number; rects: DOMRect[] };

/** Next up: drag a handle (or focus it and use the arrow keys) to reorder; remove an entry. */
function NextUpList({ items }: { items: QueueItem[] }) {
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
                  ? 'z-10 bg-surface-raised shadow-lg ring-1 ring-hairline dark:shadow-none'
                  : drag && 'transition-transform duration-150'
              )}
              style={{ '--shift': `${shift(index)}px` } as React.CSSProperties}
              item={item}
              before={
                <button
                  type="button"
                  ref={(el) => {
                    if (el) handles.current.set(item.key, el);
                    else handles.current.delete(item.key);
                  }}
                  aria-label={`Reorder ${item.title}`}
                  aria-describedby="queue-reorder-hint"
                  // A drag on the handle reorders; it mustn't start the drawer's swipe-to-close.
                  data-base-ui-swipe-ignore=""
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
