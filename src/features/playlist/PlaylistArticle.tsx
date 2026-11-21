import { Link } from '@timber-js/app/client';
import {
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  ViewTransition,
} from 'react';
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
import { playlistBlocks, type PlaylistTrackGroupRow } from './blocks';
import type { DropTarget } from './dragOps';
import {
  type Box,
  type FlowOptions,
  type FlowRow,
  flowRows,
  type GapAt,
  type ProseOwner,
  type RailCell,
} from './flow';
import type { PlaylistView } from './rows';
import SeekLink from './SeekLink';
import { isTrackRow, type PlaylistOtherRow, type PlaylistTrackRow } from './spec';

// A playlist, read like a post: a byline and lede, then the author's writing
// with the tracks embedded in it as cards. The same layout for a published
// playlist, a listener's own, and the editor (PlaylistEditor), which passes slots
// for its controls; the read pages pass none. The flow is one column of rows
// (flow.ts), each a rail cell and a content cell, so the rail can't break.
// Descriptions are the guide Markdown subset, sanitized on the server
// (src/lib/guideMarkdown); their timestamps play. No server imports and no
// hooks: it renders on either side.

/** A header action's look (the owner's Edit, the editor's Done). */
export const ACTION = `
  inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-sm
  font-medium text-text-primary transition-colors hover:bg-surface-hover
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
`;

export type { GapAt, ProseOwner } from './flow';

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
  /**
   * A row's controls (the editor's grip and menu): every kind of row gets them in
   * the same place, at the top right of its content.
   */
  controls?: (row: FlowRow) => ReactNode;
  /**
   * At each gap between blocks (and before the first, and past the last): its
   * control (Add Text), or the text being written there in its place.
   */
  gap?: (at: GapAt) => { control?: ReactNode; content?: ReactNode };
  /** Beside the play actions (save status, undo, Done). */
  toolbar?: ReactNode;
  /** The editor's state the flow lays out: what's being dragged, where the composer is. */
  flow?: Omit<FlowOptions, 'editing'>;
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
  const unavailable = view.rows.filter((r) => r.kind === 'unavailable' && !r.pending).length;
  // The editor shows each segment apart (groups), so it's clear what belongs together.
  const blocks = playlistBlocks(view.rows, { segments: !!slots });
  const groups = flowRows(blocks, { editing: !!slots, ...slots?.flow });

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
          {/* The actions sit beside the title, and wrap below it where they'd squeeze it. */}
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <h1 className="mb-0 min-w-[min(100%,16rem)] flex-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {slots?.title ?? view.name}
            </h1>
            {actions && (
              <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">{actions}</div>
            )}
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
            {/* Rows sit flush (spacing is rows too). Each row's rail cell is the first
            column; from md up it hangs in the margin, so content lines up with the header. */}
            <div className="flex flex-col md:-ml-5">
              {groups.map((group) =>
                group.segmentId ? (
                  // A section's or group's rows together: its segment drags as one.
                  <div key={group.key} data-section-id={group.segmentId} className="flex flex-col">
                    {group.rows.map((row) => (
                      <Row key={row.key} row={row} slots={slots} />
                    ))}
                  </div>
                ) : (
                  <Fragment key={group.key}>
                    {group.rows.map((row) => (
                      <Row key={row.key} row={row} slots={slots} />
                    ))}
                  </Fragment>
                )
              )}
            </div>
          </>
        )}
      </article>
    </SongQueueProvider>
  );
}

// --- Rows --------------------------------------------------------------------

/** One row of the flow: its rail cell, then its content. */
function Row({ row, slots }: { row: FlowRow; slots?: ArticleSlots }) {
  const controls = slots?.controls?.(row);
  const id = rowIdentity(row);
  const body = (
    <div className="group/row flex">
      <Rail rail={row.rail} />
      {/* A box (a section's tint, a group's outline) is its rows' content cells, stacked.
      The cell carries the row's identity, so its grip drags it whole. */}
      <div
        data-row-id={id?.id}
        data-segment-id={id?.segmentId}
        className={cn('relative min-w-0 flex-1', row.box && boxCell(row.box))}
      >
        <RowContent row={row} slots={slots} />
        {controls && (
          // The same place on every row: the top right, centered on the first line
          // (a card's play button, a block's first line of text).
          <div
            className={cn(
              'absolute right-2 z-20 flex items-center',
              row.kind === 'header' ? 'top-[5px]' : 'top-[9px]',
              row.box?.tone === 'group' && 'right-3.5'
            )}
          >
            {controls}
          </div>
        )}
      </div>
    </div>
  );
  // In the editor, rows slide to their new places when the order changes (the
  // editor commits edits as transitions; globals.css has the timing). The read
  // pages don't reorder, so they skip it.
  return slots && (row.kind === 'track' || row.kind === 'prose' || row.kind === 'header') ? (
    <ViewTransition default="playlist-move">{body}</ViewTransition>
  ) : (
    body
  );
}

/** The row the editor's grip drags and a drop lands beside (a header has none: its box). */
function rowIdentity(row: FlowRow): { id: string; segmentId: string } | undefined {
  if (row.kind === 'track') return { id: row.row.id, segmentId: row.row.segmentId };
  if (row.kind === 'prose')
    return (
      row.dragRow ??
      (row.owner.kind === 'segment'
        ? { id: `comment:${row.owner.id}`, segmentId: row.owner.id }
        : undefined)
    );
  return undefined;
}

/** In the editor, room at the right of every row for its controls. */
const CONTROLS_ROOM = 'pr-[84px]';

/** One row's piece of its box: the sides, and the top or bottom at the ends. */
function boxCell({ position, tone }: Box) {
  const top = position === 'first' || position === 'only';
  const bottom = position === 'last' || position === 'only';
  return tone === 'section'
    ? // Clipped at the ends, so a card's hover fill keeps the box's corners.
      cn(
        SECTION_TINT,
        top && 'overflow-hidden rounded-t-2xl',
        bottom && 'overflow-hidden rounded-b-2xl'
      )
    : cn(
        'border-x border-dashed border-text-primary/20 px-1.5',
        top && 'rounded-t-2xl border-t pt-1.5',
        bottom && 'rounded-b-2xl border-b pb-1.5'
      );
}

function RowContent({ row, slots }: { row: FlowRow; slots?: ArticleSlots }) {
  switch (row.kind) {
    case 'space':
      return <div aria-hidden style={{ height: row.height }} />;
    case 'gap':
      return (
        <div className="py-2">
          <Gap at={row.at} slots={slots} />
        </div>
      );
    case 'drop':
      return (
        <DropZone
          target={row.target}
          alone={row.target.kind === 'gap' && slots?.flow?.dragging?.kind === 'entry'}
        />
      );
    case 'track':
      return isTrackRow(row.row) ? (
        <TrackCell row={row.row} box={row.box} slots={slots} />
      ) : (
        <UnavailableCell row={row.row} box={row.box} slots={slots} />
      );
    case 'header':
      return (
        <div
          className="
          flex h-[42px] items-center pl-[53px] text-[11px] font-semibold tracking-wide
          text-text-muted uppercase
        "
        >
          {row.tone === 'section' ? 'Section' : 'Group'}
        </div>
      );
    case 'prose':
      return (
        <Prose
          owner={row.owner}
          blocks={row.prose}
          slots={slots}
          className={cn(
            FLOW_INDENT,
            COMMENTARY,
            // In a section's box: its tint and corners, and room inside it.
            // The box spans the row; the text inside keeps its measure.
            row.box && 'max-w-none py-3 pr-4 *:max-w-[65ch]',
            row.box && row.owner.kind === 'segment' && 'pb-3.5',
            // The editor: the same padding for every block, and room for its controls.
            slots && cn('max-w-none py-3 *:max-w-[65ch]', CONTROLS_ROOM)
          )}
        />
      );
  }
}

// --- The rail -----------------------------------------------------------------
//
// One line down the left from the first track's dot to the last's. Each row draws
// its own stretch in its rail cell (full height between, from or to the dot at a
// track), so the line holds whatever the rows are and however tall.

/** From a row's top to the middle of a card's title line (and play button). */
const DOT_Y = 25;
/** The rail's x within its 20px cell; the dot (8px) centers on it. */
const RAIL_X = 9;
const LINE = 'pointer-events-none absolute w-px bg-text-primary/15';

function Rail({ rail }: { rail: RailCell }) {
  return (
    <div aria-hidden className="relative w-5 shrink-0">
      {rail.dot ? (
        <>
          {rail.above && <span className={LINE} style={{ left: RAIL_X, top: 0, height: DOT_Y }} />}
          {rail.below && <span className={LINE} style={{ left: RAIL_X, top: DOT_Y, bottom: 0 }} />}
          {/* Filled while its track is the one playing. */}
          <span
            className="
              absolute size-2 rounded-full border border-text-primary/30
              group-has-[[data-current-track]]/row:border-accent
              group-has-[[data-current-track]]/row:bg-accent
            "
            style={{ left: RAIL_X - 3.5, top: DOT_Y - 4 }}
          />
          {/* The branch, from the dot to the card. */}
          <span
            className="absolute h-px bg-text-primary/30"
            style={{ left: RAIL_X + 4.5, right: 0, top: DOT_Y }}
          />
        </>
      ) : (
        (rail.above || rail.below) && (
          <span className={LINE} style={{ left: RAIL_X, top: 0, bottom: 0 }} />
        )
      )}
    </div>
  );
}

/** A section's tint, on each of its rows' content cells (they stack flush into one box). */
const SECTION_TINT = 'bg-text-primary/[0.035]';

/**
 * The editor's composer (text or tracks being added there), or its Add zone at
 * the end of the playlist.
 */
function Gap({ at, slots }: { at: GapAt; slots?: ArticleSlots }) {
  const gap = slots?.gap?.(at);
  if (!gap) return null;
  return (
    <div className="rounded-xl border border-dashed border-text-primary/15">
      {gap.content ? <div className="py-2 pr-3 pl-[52px]">{gap.content}</div> : gap.control}
    </div>
  );
}

/**
 * While dragging: a place it can land. usePlaylistDrag finds it by its target and
 * lights it up when the pointer's over it.
 */
function DropZone({ target, alone }: { target: DropTarget; alone: boolean }) {
  return (
    <div className="py-1">
      <div
        data-drop-zone={JSON.stringify(target)}
        className="
          flex h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed
          border-text-primary/20 text-xs text-text-muted transition-colors
          data-[drop-over]:border-accent data-[drop-over]:bg-accent/15 data-[drop-over]:text-accent
        "
      >
        {alone ? 'Move here, on its own' : 'Move here'}
      </div>
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
  className,
  children,
}: {
  owner: ProseOwner;
  blocks?: GuideBlock[];
  slots?: ArticleSlots;
  className?: string;
  children?: ReactNode;
}) {
  const editing = slots?.prose?.(owner);
  if (!editing && !blocks?.length) return null;
  const open = !editing && slots?.editProse ? () => slots.editProse?.(owner) : undefined;
  const pending = !editing && !!slots?.prosePending?.(owner);
  return (
    <div
      className={cn(
        PROSE,
        'group/prose',
        open && 'relative',
        // Editable: above a cell's play-anywhere overlay, and marked as text to click
        // into. An outline, not padding or a margin: hovering moves nothing.
        open &&
          `
            z-10 cursor-text outline-1 -outline-offset-1 outline-transparent
            transition-[outline-color]
            hover:outline-text-primary/15 hover:outline-dashed focus-visible:outline-2
            focus-visible:outline-accent
          `,
        // Shown as written until the server renders it: dimmed, gently pulsing.
        pending && 'animate-pulse opacity-60 motion-reduce:animate-none',
        className
      )}
      aria-busy={pending || undefined}
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

/** A card: a 1px border (transparent but an unavailable one's), so content lines up. */
const CELL = 'relative flex gap-3 border border-transparent py-2.5 pr-1.5 pl-3';

/**
 * A card's own look: rounded and filled, unless it's in a section, whose box
 * fills it (then the card only tints on hover).
 */
const cardLook = (box: Box | null) => (box?.tone === 'section' ? '' : 'rounded-xl');
/** While dragging a track: a card is somewhere to drop it, to group with it. */
const JOIN_TARGET = `
  data-[drop-over]:ring-2 data-[drop-over]:ring-accent data-[drop-over]:ring-inset
  data-[drop-over]:after:absolute data-[drop-over]:after:right-3 data-[drop-over]:after:bottom-2
  data-[drop-over]:after:text-xs data-[drop-over]:after:text-accent
  data-[drop-over]:after:content-['Group_with_this']
`;

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
  box,
  slots,
}: {
  row: PlaylistTrackRow;
  box: Box | null;
  slots?: ArticleSlots;
}) {
  const name = `${row.trackTitle ?? 'Track'}, ${row.date}`;
  return (
    <div
      data-row-id={row.id}
      data-segment-id={row.segmentId}
      data-card=""
      className={cn(
        CELL,
        cardLook(box),
        // The editor: room for the row's controls at the right.
        slots && CONTROLS_ROOM,
        JOIN_TARGET,
        box?.tone !== 'section' && 'bg-text-primary/[0.035]',
        `
          group/cell items-start transition-colors
          hover:bg-text-primary/[0.06]
          has-[[data-current-track]]:bg-accent/10 [&_a,&_button]:relative [&_a,&_button]:z-10
        `
      )}
    >
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
        {/* The editor has its own controls in the row's corner. */}
        {!slots && (
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
      {/* Clipped to the card's corners. Only the scrubber takes pointer events. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <EntryProgress
          queueKey={row.queueKey}
          title={row.trackTitle ?? 'track'}
          fallbackDuration={row.songDuration ?? undefined}
        />
      </div>
    </div>
  );
}

/** Kept in its place, with its note, so the writing around it still reads. */
function UnavailableCell({
  row,
  box,
  slots,
}: {
  row: PlaylistOtherRow;
  box: Box | null;
  slots?: ArticleSlots;
}) {
  return (
    <div
      data-row-id={row.id}
      data-segment-id={row.segmentId}
      data-card=""
      className={cn(
        CELL,
        cardLook(box),
        // The editor: room for the row's controls at the right.
        slots && CONTROLS_ROOM,
        JOIN_TARGET,
        'group/cell items-start border-dashed border-hairline text-text-muted'
      )}
    >
      {/* The play button's width, so titles line up. */}
      <span aria-hidden className="w-7 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col pt-0.5">
        {row.pending ? (
          <>
            <span className="animate-pulse text-[15px] leading-snug motion-reduce:animate-none">
              Adding track…
            </span>
            <span className="text-[13px]">Looking it up.</span>
          </>
        ) : (
          <>
            <span className="text-[15px] leading-snug">Unavailable track</span>
            <span className="text-[13px]">This recording isn&rsquo;t on Relisten anymore.</span>
          </>
        )}
        <Note id={row.id} blocks={row.prose} slots={slots} />
      </div>
    </div>
  );
}
