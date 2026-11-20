import { Link } from '@timber-js/app/client';
import { Fragment, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import cn from '@/lib/cn';
import GuideProse, { type RenderSeek } from '@/lib/guideMarkdown/GuideProse';
import type { GuideBlock } from '@/lib/guideMarkdown/types';
import { durationToHHMMSS, numberFormat } from '@/lib/utils';
import EntryProgress from '@/player/EntryProgress';
import PlayTrackButton, { PlayTrackRow } from '@/player/PlayTrackButton';
import QueueButtons, { ShowQueueActions } from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
import { SongQueueProvider } from '@/player/SongQueue';
import TrackLoadDot from '@/player/TrackLoadDot';
import { songRowItem } from '@/player/queue/items';
import { formatShowDate } from '@/ui/shows/stats';
import {
  type BlockEdge,
  blockEdges,
  playlistBlocks,
  type PlaylistBlock,
  type PlaylistItem,
  type PlaylistTrackGroupRow,
} from './blocks';
import type { PlaylistView } from './rows';
import SeekLink from './SeekLink';
import { isTrackRow, type PlaylistOtherRow, type PlaylistTrackRow } from './spec';

// A playlist, read like a post: a byline and lede, then the author's writing
// with the tracks embedded in it as cards. The same layout for a published
// playlist, a listener's own, and the editor (src/features/playlist/edit), which
// passes slots for its controls; the read pages pass none. Descriptions are the
// guide Markdown subset, sanitized on the server (src/lib/guideMarkdown); their
// timestamps play. No server imports and no hooks: it renders on either side.

/** A header action's look (the owner's Edit, the editor's Done). */
export const ACTION = `
  inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-sm
  font-medium text-text-primary transition-colors hover:bg-surface-hover
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
`;

/** Whose prose a block is: the editor edits it by this. */
export type ProseOwner =
  | { kind: 'playlist' }
  /** A described segment's comment. */
  | { kind: 'segment'; id: string }
  /** A text block: an entry's id, or a prose-only segment's. */
  | { kind: 'text'; id: string }
  /** A track's note, by entry id. */
  | { kind: 'note'; id: string };

/** A gap between blocks: the rows on either side of it, and whether the rail runs through. */
export type GapAt = {
  index: number;
  above?: BlockEdge;
  below?: BlockEdge;
  railThrough: boolean;
};

/** The editor's controls. Each is optional; the read pages pass none. */
export type ArticleSlots = {
  /** In place of the title's text (an input). */
  title?: ReactNode;
  /** In place of a prose block's text, while it's being edited; undefined otherwise. */
  prose?: (owner: ProseOwner) => ReactNode | undefined;
  /** Whether a prose block's text is waiting on the server's render of it. */
  prosePending?: (owner: ProseOwner) => boolean;
  /** Opens a prose block for editing: a click on it (not on a link in it), or Enter. */
  editProse?: (owner: ProseOwner) => void;
  /** A menu on a prose block (`hasText`: there's text to edit, not just to add). */
  proseMenu?: (owner: ProseOwner, hasText: boolean) => ReactNode;
  /** In place of a track's ⋯ menu; beside an unavailable track. */
  cellMenu?: (row: PlaylistTrackGroupRow) => ReactNode;
  /**
   * At each gap between blocks (and before the first, and past the last): its
   * control (Add Text), or the text being written there in its place.
   */
  gap?: (at: GapAt) => { control?: ReactNode; content?: ReactNode };
  /** Beside the play actions (save status, undo, Done). */
  toolbar?: ReactNode;
};

/** "27 min", "1 hr 12 min". */
export function readableDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

export default function PlaylistArticle({
  view,
  byline = [],
  actions,
  slots,
}: {
  view: PlaylistView;
  /** The byline's leading items ("By alice", a link back, "Published"). */
  byline?: ReactNode[];
  /** At the top right, beside the title (Edit, Done). */
  actions?: ReactNode;
  slots?: ArticleSlots;
}) {
  // A track's play button queues the playlist's tracks, in order.
  const items = view.rows.flatMap((r) => (isTrackRow(r) ? (songRowItem(r) ?? []) : []));
  const unavailable = view.rows.filter((r) => r.kind === 'unavailable').length;
  const blocks = playlistBlocks(view.rows);
  const rail = railLayout(blocks);

  const meta = [
    ...byline,
    `${numberFormat.format(view.trackCount)} ${view.trackCount === 1 ? 'track' : 'tracks'}`,
    view.duration > 0 && readableDuration(view.duration),
    unavailable > 0 && `${numberFormat.format(unavailable)} unavailable`,
  ].filter(Boolean);

  return (
    // The whole article shares the queue: a timestamp in any prose plays from it.
    <SongQueueProvider label={view.name} items={items}>
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="mb-0 min-w-0 flex-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {slots?.title ?? view.name}
            </h1>
            {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
          </div>
          <div className="text-sm text-text-muted [&_a]:text-text-muted [&_a:hover]:text-accent">
            {meta.map((item, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden> · </span>}
                {item}
              </span>
            ))}
          </div>
          <Prose
            owner={{ kind: 'playlist' }}
            blocks={view.description}
            slots={slots}
            className="mt-2 text-text-secondary"
          />
        </header>

        {blocks.length === 0 && !slots ? (
          <p className="text-text-muted">Nothing here yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {items.length > 0 && <ShowQueueActions playlist />}
              {slots?.toolbar}
            </div>
            {/* The left padding holds the rail; from md up it hangs in the margin instead,
            and everything lines up with the header. */}
            <div className="flex flex-col gap-4 pl-6 md:-ml-6">
              {blocks.map((block, i) => (
                <Fragment key={block.key}>
                  {slots?.gap && <Gap at={gapAt(blocks, i)} slots={slots} />}
                  <Block block={block} rail={rail} slots={slots} />
                </Fragment>
              ))}
              {slots?.gap && <Gap at={gapAt(blocks, blocks.length)} slots={slots} />}
            </div>
          </>
        )}
      </article>
    </SongQueueProvider>
  );
}

function gapAt(blocks: readonly PlaylistBlock[], index: number): GapAt {
  const hasTrack = (b: PlaylistBlock) =>
    (b.kind === 'section' ? b.items : [b]).some((item) => item.kind === 'tracks');
  return {
    index,
    above: index > 0 ? blockEdges(blocks[index - 1])?.last : undefined,
    below: index < blocks.length ? blockEdges(blocks[index])?.first : undefined,
    railThrough: blocks.slice(0, index).some(hasTrack) && blocks.slice(index).some(hasTrack),
  };
}

/**
 * The editor's place between blocks: a full-width dashed zone in the flow, holding
 * its control (Add Text) or what's being written there. Marked with the segments
 * on either side, since a drag drops into it too. The rail runs down through it.
 */
function Gap({ at, slots }: { at: GapAt; slots: ArticleSlots }) {
  const gap = slots.gap?.(at);
  if (!gap) return null;
  return (
    <div
      data-gap=""
      data-above={at.above?.segmentId}
      data-below={at.below?.segmentId}
      className="
        relative rounded-xl border border-dashed border-text-primary/15 transition-colors
        data-[drop-over]:border-accent data-[drop-over]:bg-accent/20
        data-[drop-over]:[&_button]:text-accent
      "
    >
      {at.railThrough && (
        // Across the gap above and down its own height, 1px in from its border like a cell's.
        <span
          aria-hidden
          className={RAIL_LINE}
          style={{ left: -12, top: -1 - FLOW_GAP, bottom: -1 }}
        />
      )}
      {gap.content ? <div className="py-2 pr-3 pl-[52px]">{gap.content}</div> : gap.control}
    </div>
  );
}

/** A timestamp in the prose: plays its entry from there. */
const renderSeek: RenderSeek = (seek, label, href) => (
  <SeekLink entryId={seek.entryId} seconds={seek.seconds} href={href}>
    {label}
  </SeekLink>
);

/**
 * What the author wrote, in the prose voice. Children go first (the rail). The
 * editor's slots can replace the text (while it's being edited) and add a menu;
 * with neither and no text, nothing renders.
 */
export function Prose({
  owner,
  blocks,
  slots,
  row,
  className,
  children,
}: {
  owner: ProseOwner;
  blocks?: GuideBlock[];
  slots?: ArticleSlots;
  /** A text block's place in the flow, for the editor's dragging. */
  row?: { id: string; segmentId: string };
  className?: string;
  children?: ReactNode;
}) {
  const editing = slots?.prose?.(owner);
  const menu = slots?.proseMenu?.(owner, !!blocks?.length);
  if (!editing && !blocks?.length) return null;
  const open = !editing && slots?.editProse ? () => slots.editProse?.(owner) : undefined;
  const pending = !editing && !!slots?.prosePending?.(owner);
  return (
    <div
      className={cn(
        PROSE,
        'group/prose',
        (menu || open) && 'relative',
        // Editable: above a cell's play-anywhere overlay, and marked as text to click into.
        open &&
          `
            z-10 -mx-1.5 cursor-text rounded-md px-1.5 transition-colors
            hover:bg-text-primary/[0.04] focus-visible:outline-2 focus-visible:outline-accent
          `,
        // Shown as written until the server renders it: dimmed, gently pulsing.
        pending && 'animate-pulse opacity-60 motion-reduce:animate-none',
        className
      )}
      aria-busy={pending || undefined}
      data-row-id={row?.id}
      data-segment-id={row?.segmentId}
      {...(open && {
        tabIndex: 0,
        title: 'Click to edit',
        // A link or button inside (a timestamp, the menu) keeps its own click.
        onClick: (e: MouseEvent<HTMLDivElement>) => {
          if (!(e.target as HTMLElement).closest('a, button')) open();
        },
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' && e.target === e.currentTarget) {
            e.preventDefault();
            open();
          }
        },
      })}
    >
      {children}
      {editing ?? <GuideProse blocks={blocks ?? []} renderSeek={renderSeek} />}
      {menu && !editing && <div className="absolute top-0 right-0">{menu}</div>}
    </div>
  );
}

// One voice for everything the author wrote (description, sections, text,
// track notes); metadata is smaller and muted.
const PROSE = 'text-[15px] leading-relaxed text-pretty text-text-primary';
// Prose between tracks starts where track titles and notes do (a cell's 1px
// border, 12px padding, 28px play button and 12px gap), so the writing reads
// as one column. The rail's segments sit left of it, at -12px from the block.
const FLOW_INDENT = 'pl-[53px]';
// The author's longer writing (comments, text blocks): about 65 characters a
// line past the indent, and a touch softer than track titles, so it reads as
// commentary on them.
const COMMENTARY = 'max-w-[calc(65ch+53px)] text-text-primary/85';

// --- The rail ---------------------------------------------------------------
//
// A line down the left from the first track to the last, past everything
// between. Each card has a dot beside its title with a branch to the card; each
// element draws the line beside itself and across the gap above it, so the
// line is unbroken however the elements are spaced.

/** One element's piece of the rail. */
type RailPiece = {
  /** The gap above it (px), which its line also covers. */
  gapAbove: number;
  /** A track comes before it / after it: the line runs above / below its dot. */
  before: boolean;
  after: boolean;
};

/** Every card's and paragraph's rail piece, by key. */
type RailLayout = Map<string, RailPiece>;

const FLOW_GAP = 16; // gap-4 between blocks
const CELL_GAP = 6; // gap-1.5 between cells, and between a section's items

/**
 * Walks the blocks in order, noting the gap above each card and paragraph and
 * whether any track comes before or after it.
 */
function railLayout(blocks: readonly PlaylistBlock[]): RailLayout {
  const pieces: { key: string; gapAbove: number; card: boolean }[] = [];
  let gap = 0; // the gap above the next element
  let inSection = false;
  const add = (key: string, card: boolean) => {
    pieces.push({ key, gapAbove: gap, card });
    // Inside a section everything stacks flush; elsewhere cells are 6px apart.
    gap = inSection ? 0 : CELL_GAP;
  };
  const addItem = (item: PlaylistItem) => {
    if (item.kind === 'text') add(item.key, false);
    else
      item.rows.forEach((row, i) => {
        // Loose cells in a run are 6px apart; in a section they stack flush.
        if (i > 0) gap = inSection ? 0 : CELL_GAP;
        add(row.id, true);
      });
  };
  blocks.forEach((block, i) => {
    // Between blocks: the flow's gap (sections have no border or padding to add).
    gap = i > 0 ? FLOW_GAP : 0;
    if (block.kind === 'section') {
      inSection = true;
      block.items.forEach(addItem);
      add(block.key, false);
      inSection = false;
    } else {
      addItem(block);
    }
  });
  const first = pieces.findIndex((p) => p.card);
  const last = pieces.findLastIndex((p) => p.card);
  return new Map(
    pieces.map((p, i) => [p.key, { gapAbove: p.gapAbove, before: i > first, after: i < last }])
  );
}

// Offsets count from a cell's padding box, 1px in from its border.
const RAIL_LINE = 'pointer-events-none absolute w-px bg-text-primary/15';

/** Beside a paragraph: the line, if it passes, from the gap above to its bottom. */
function RailThrough({ piece }: { piece?: RailPiece }) {
  if (!piece?.before || !piece.after) return null;
  // No border: 1px further right than a cell's offsets, to line up.
  return (
    <span
      aria-hidden
      className={RAIL_LINE}
      style={{ left: -11, top: -piece.gapAbove, bottom: 0 }}
    />
  );
}

/** Beside a cell: the line above its dot (across the gap above), below it, and the branch. */
function RailStop({ piece }: { piece?: RailPiece }) {
  if (!piece) return null;
  return (
    <>
      {piece.before && (
        <span
          aria-hidden
          className={RAIL_LINE}
          style={{ left: -12, top: -1 - piece.gapAbove, height: 21 + piece.gapAbove }}
        />
      )}
      {piece.after && (
        <span aria-hidden className={RAIL_LINE} style={{ left: -12, top: 28, bottom: -1 }} />
      )}
      <span
        aria-hidden
        className="absolute top-6 h-px bg-text-primary/30"
        // From the dot's edge to the outer edge: the cell's border, or a section box's
        // (it stops there rather than crossing it).
        style={{ left: -7.5, width: 6.5 }}
      />
    </>
  );
}

function Block({
  block,
  rail,
  slots,
}: {
  block: PlaylistBlock;
  rail: RailLayout;
  slots?: ArticleSlots;
}) {
  if (block.kind !== 'section') return <Item item={block} rail={rail} slots={slots} />;
  // A described segment, boxed: its entries, then the author's comment on them.
  return (
    // One shape: a soft tint, no outline. Its cells drop their own fill (it comes
    // back on hover and while playing) and stack flush, square but for the top
    // one's corners.
    <section
      data-section-id={block.segmentId}
      className={`
        flex flex-col rounded-2xl bg-text-primary/[0.035]
        [&_li]:rounded-none [&_li]:bg-transparent
        [&>ol:first-child>li:first-child]:rounded-t-2xl
      `}
    >
      {block.items.map((item) => (
        <Item key={item.key} item={item} rail={rail} slots={slots} inSection />
      ))}
      <Prose
        owner={{ kind: 'segment', id: block.segmentId }}
        blocks={block.comment}
        slots={slots}
        className={cn(FLOW_INDENT, COMMENTARY, 'relative pt-3 pr-4 pb-3.5')}
      >
        <RailThrough piece={rail.get(block.key)} />
      </Prose>
    </section>
  );
}

function Item({
  item,
  rail,
  slots,
  inSection = false,
}: {
  item: PlaylistItem;
  rail: RailLayout;
  slots?: ArticleSlots;
  /** In a section box: flush, so text gets its own padding. */
  inSection?: boolean;
}) {
  if (item.kind === 'text') {
    return (
      <Prose
        owner={{ kind: 'text', id: item.key }}
        blocks={item.prose}
        slots={slots}
        row={{ id: item.key, segmentId: item.segmentId }}
        className={cn(FLOW_INDENT, COMMENTARY, 'relative', inSection && 'py-3 pr-4')}
      >
        <RailThrough piece={rail.get(item.key)} />
      </Prose>
    );
  }
  // Each track its own cell, like a notebook's; a run of them sits closer
  // together than prose does.
  return (
    // Loose cells have fills, so they need a gap; a section's don't, so its rows stack flush.
    <ol className={cn('m-0 flex list-none flex-col p-0', !inSection && 'gap-1.5')}>
      {item.rows.map((row) => {
        const stop = <RailStop piece={rail.get(row.id)} />;
        return isTrackRow(row) ? (
          <TrackCell key={row.id} row={row} rail={stop} slots={slots} />
        ) : (
          <UnavailableCell key={row.id} row={row} rail={stop} slots={slots} />
        );
      })}
    </ol>
  );
}

// ml-0: the global `li` rule indents list items.
const CELL = cn(
  // Every cell has a 1px border (transparent but the unavailable one's), so the
  // rail's offsets match from cell to cell.
  'relative ml-0 flex list-none gap-3 rounded-xl border border-transparent py-2.5 pr-1.5 pl-3',
  // The rail's dot beside the title line, filled while it's the current track.
  `
    before:absolute before:top-5 before:left-[-15.5px] before:size-2
    before:rounded-full before:border before:border-text-primary/30 before:content-['']
    has-[[data-current-track]]:before:border-accent
    has-[[data-current-track]]:before:bg-accent
  `
);

/** A track's note, under its show line. */
function Note({ id, blocks, slots }: { id: string; blocks?: GuideBlock[]; slots?: ArticleSlots }) {
  return <Prose owner={{ kind: 'note', id }} blocks={blocks} slots={slots} className="mt-1" />;
}

/**
 * One track: play, title, the show it's from, its note, and its length. A click
 * anywhere plays it (PlayTrackRow); Play next / Add to queue show on hover, and
 * the menu always (the only place for them on touch screens).
 */
function TrackCell({
  row,
  rail,
  slots,
}: {
  row: PlaylistTrackRow;
  rail: ReactNode;
  slots?: ArticleSlots;
}) {
  const name = `${row.trackTitle ?? 'Track'}, ${row.date}`;
  return (
    <li
      data-row-id={row.id}
      data-segment-id={row.segmentId}
      className={cn(
        CELL,
        `
          group/cell items-start bg-text-primary/[0.035] transition-colors
          hover:bg-text-primary/[0.06]
          has-[[data-current-track]]:bg-accent/10 [&_a,&_button]:relative [&_a,&_button]:z-10
        `
      )}
    >
      {rail}
      <PlayTrackRow row={row} track={row.track} />
      <PlayTrackButton row={row} track={row.track} label={`Play ${name}`} />
      <div className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="truncate text-[15px] leading-snug font-medium">
          {row.trackTitle ?? 'Untitled'}
        </span>
        <span className="truncate text-[13px] text-text-muted">
          <Link href={row.href} className="text-text-muted hover:text-accent">
            {row.artistName} · {formatShowDate(row.date)}
          </Link>
          {row.venueName && <> · {row.venueName}</>}
        </span>
        <Note id={row.id} blocks={row.prose} slots={slots} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {row.track.mp3Url && (
          <QueueButtons
            item={songRowItem(row)}
            name={name}
            className={`
              opacity-0 transition-opacity group-focus-within/cell:opacity-100
              group-hover/cell:opacity-100 max-sm:hidden
            `}
          />
        )}
        <span className="flex items-center gap-2 px-1 text-[13px] text-text-muted tabular-nums">
          <TrackLoadDot entryKey={row.queueKey} />
          {row.songDuration ? durationToHHMMSS(Math.round(row.songDuration)) : '—'}
        </span>
        {/* Faded until the row is hovered or focused (or its menu is open); always
        shown on touch screens, which can't hover. */}
        {slots?.cellMenu?.(row) ?? (
          <QueueMenu
            item={songRowItem(row)}
            name={name}
            className={`
              opacity-0 transition-opacity group-focus-within/cell:opacity-100
              group-hover/cell:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100
            `}
          />
        )}
      </div>
      {/* Clipped to the cell's corners; the cell itself isn't, so the rail can leave it.
      Only the scrubber takes pointer events. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <EntryProgress
          queueKey={row.queueKey}
          title={row.trackTitle ?? 'track'}
          fallbackDuration={row.songDuration ?? undefined}
        />
      </div>
    </li>
  );
}

/** Kept in its place, with its note, so the writing around it still reads. */
function UnavailableCell({
  row,
  rail,
  slots,
}: {
  row: PlaylistOtherRow;
  rail: ReactNode;
  slots?: ArticleSlots;
}) {
  return (
    <li
      data-row-id={row.id}
      data-segment-id={row.segmentId}
      className={cn(CELL, 'group/cell items-start border-dashed border-hairline text-text-muted')}
    >
      {rail}
      {/* The play button's width, so titles line up. */}
      <span aria-hidden className="w-7 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="text-[15px] leading-snug">Unavailable track</span>
        <span className="text-[13px]">This recording isn&rsquo;t on Relisten anymore.</span>
        <Note id={row.id} blocks={row.prose} slots={slots} />
      </div>
      {slots?.cellMenu?.(row)}
    </li>
  );
}
