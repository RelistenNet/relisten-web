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
import { ShowQueueActions } from '@/player/QueueButtons';
import { SongQueueProvider } from '@/player/SongQueue';
import { songRowItem } from '@/player/queue/items';
import { formatShowDate } from '@/ui/shows/stats';
import { playlistBlocks, type PlaylistTrackGroupRow } from './blocks';
import type { DragSource } from './dragOps';
import {
  type Box,
  type FlowGroup,
  type FlowOptions,
  type FlowRow,
  flowRows,
  type GapAt,
  type ProseOwner,
  type RailCell,
} from './flow';
import type { PlaylistView } from './rows';
import SeekLink from './SeekLink';
import TrackCardPlayer from './TrackCardPlayer';
import { isTrackRow, type PlaylistOtherRow, type PlaylistTrackRow } from './spec';

// A playlist, read like a post: a byline and lede, then the author's writing
// with the tracks embedded in it as cards. The same layout for a published
// playlist, a listener's own, and the editor (PlaylistEditor), which passes slots
// for its controls; the read pages pass none. The flow is one column of rows
// (flow.ts), each a rail cell and a content cell, so the rail can't break.
// Descriptions are the guide Markdown subset, sanitized on the server
// (src/lib/guideMarkdown); their timestamps play. No server imports and no
// hooks: it renders on either side.

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
   * A card's menu, in the read view's ⋯ place (so nothing moves): the editor's
   * Edit menu instead of the queue menu.
   */
  cellMenu?: (row: PlaylistTrackGroupRow) => ReactNode;
  /** A section's or group's menu, at its box's top-right corner. */
  boxMenu?: (group: { segmentId: string; tone: 'section' | 'group' }) => ReactNode;
  /**
   * What dragging a row or box moves, and what the drag image says (the editor's
   * drag wiring reads it from `data-drag`); undefined for what doesn't drag.
   */
  drag?: (target: FlowRow | FlowGroup) => DragSpec | undefined;
  /**
   * At each gap between blocks (and before the first, and past the last): its
   * control (Add Text), or the text being written there in its place.
   */
  gap?: (at: GapAt) => { control?: ReactNode; content?: ReactNode };
  /** Beside the play actions (save status, undo, Done). */
  toolbar?: ReactNode;
  /** The editor's state the flow lays out: where the composer is, a new intro. */
  flow?: Omit<FlowOptions, 'editing'>;
};

/** A drag's source and its image's label, as a row's or box's `data-drag`. */
export type DragSpec = { source: DragSource; label: string };

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
  // The same blocks for readers and the editor (which outlines its groups over
  // them), so opening the editor moves nothing.
  const blocks = playlistBlocks(view.rows, { keepEmpty: !!slots });
  const groups = flowRows(blocks, { editing: !!slots, ...slots?.flow });
  // Each animated row is captured by every transition: past this many, edits and
  // the page ↔ editor morph cost more than a frame, so long playlists don't animate.
  const animate = view.rows.length <= MAX_ANIMATED_ROWS;

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
            <div className="flex flex-col md:-ml-rail">
              {groups.map((group) =>
                group.segmentId && group.tone ? (
                  // A section's or group's rows together: its segment drags as one,
                  // by its label.
                  <div
                    key={group.key}
                    data-drag={dragAttr(slots?.drag?.(group))}
                    className="relative flex flex-col"
                  >
                    {slots && (
                      <BoxFrame
                        tone={group.tone}
                        menu={slots.boxMenu?.({ segmentId: group.segmentId, tone: group.tone })}
                      />
                    )}
                    {group.rows.map((row) => (
                      <Row key={row.key} row={row} slots={slots} animate={animate} />
                    ))}
                  </div>
                ) : (
                  <Fragment key={group.key}>
                    {group.rows.map((row) => (
                      <Row key={row.key} row={row} slots={slots} animate={animate} />
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
/** Above this many rows, rows don't animate (measured: 308 rows cost 90–250ms a transition). */
const MAX_ANIMATED_ROWS = 150;

function Row({ row, slots, animate }: { row: FlowRow; slots?: ArticleSlots; animate: boolean }) {
  // The editor: where a drop on this row lands (the drag wiring reads it), and the
  // indicator it draws while one's over it: over the row, so nothing moves.
  const drop = slots && row.drop ? JSON.stringify(row.drop) : undefined;
  const body = (
    <div className="group/row flex">
      <Rail rail={row.rail} />
      {/* A section's tint is its rows' content cells, stacked. A track's or text's
      cell is what dragging it moves. */}
      <div
        data-drag={dragAttr(slots?.drag?.(row))}
        data-drop={row.kind === 'space' ? undefined : drop}
        className={cn(
          // A row with a field open in it sits above the rows after it, so the field's
          // floating toolbar isn't drawn under the next row's text.
          'relative min-w-0 flex-1 has-[textarea]:z-30',
          row.box && boxCell(row.box),
          // Where a drop lands, drawn over the row (globals.css).
          drop && row.kind !== 'space' && 'drop-indicator'
        )}
      >
        <RowContent row={row} slots={slots} drop={drop} />
      </div>
    </div>
  );
  // Rows glide to their new places whenever their layout changes in a transition:
  // an edit (the editor commits them as transitions), drop zones closing, and the
  // move between the playlist's page and its editor (a navigation), where each row
  // is named, so it morphs from where it was on one page to where it is on the
  // other. globals.css has the timing.
  return animate && (row.kind === 'track' || row.kind === 'prose') ? (
    <ViewTransition name={transitionName(row.key)} share="playlist-move" default="playlist-move">
      {body}
    </ViewTransition>
  ) : (
    body
  );
}

/** A row's view-transition name: its key, as a valid CSS identifier. */
const transitionName = (key: string) => `pl-${key.replace(/[^\w-]/g, '-')}`;

const dragAttr = (spec: DragSpec | undefined) => (spec ? JSON.stringify(spec) : undefined);

/**
 * The editor's frame for a section or group, drawn over its rows (it takes no
 * room): a group's dashed outline, its label on the top border (which is what
 * drags the box), and its menu at the top-right corner.
 */
function BoxFrame({ tone, menu }: { tone: 'section' | 'group'; menu?: ReactNode }) {
  return (
    <>
      {tone === 'group' && (
        <div
          aria-hidden
          className="
            pointer-events-none absolute -inset-x-1 -inset-y-[3px] rounded-2xl border
            border-dashed border-text-primary/20
          "
        />
      )}
      <span
        title="Drag to move"
        className="
          absolute -top-[9px] left-12 z-20 cursor-grab rounded-full bg-surface px-1.5
          text-[10px] leading-[18px] font-semibold tracking-wide text-text-muted uppercase
          select-none active:cursor-grabbing
        "
      >
        {tone === 'section' ? 'Section' : 'Group'}
      </span>
      {menu && <div className="absolute -top-4 right-1 z-20">{menu}</div>}
    </>
  );
}

/** A box's rounded corners, for a row at this position in it (and what fills the row). */
function boxCorners({ position }: Box) {
  return cn(
    (position === 'first' || position === 'only') && 'rounded-t-2xl',
    (position === 'last' || position === 'only') && 'rounded-b-2xl'
  );
}

/**
 * One row's piece of a section's box. Not clipped (a field's floating toolbar
 * would be): what fills a box's row (a card's hover, a block's) takes the box's
 * corners itself (boxCorners).
 */
function boxCell(box: Box) {
  return cn('bg-text-primary/[0.035]', boxCorners(box));
}

function RowContent({ row, slots, drop }: { row: FlowRow; slots?: ArticleSlots; drop?: string }) {
  switch (row.kind) {
    case 'space':
      return (
        <div aria-hidden style={{ height: row.height }} className="relative">
          {drop && (
            // A place to drop; with no height (before everything), it reaches up into
            // the space above.
            <div
              data-drop={drop}
              className={cn(
                'absolute inset-x-0',
                row.height ? 'inset-y-0' : '-top-5 h-5',
                'drop-indicator-between'
              )}
            />
          )}
        </div>
      );
    case 'gap':
      return (
        <div className="py-2">
          <Gap at={row.at} slots={slots} />
        </div>
      );
    case 'track':
      return isTrackRow(row.row) ? (
        <TrackCell row={row.row} box={row.box} slots={slots} />
      ) : (
        <UnavailableCell row={row.row} box={row.box} slots={slots} />
      );
    case 'prose':
      return (
        <Prose
          owner={row.owner}
          blocks={row.prose}
          slots={slots}
          className={cn(
            // The author's longer writing, between the tracks: it starts where their
            // titles do, so it reads as one column with them; about 65 characters a
            // line; a touch softer than the titles, as commentary on them.
            `
              max-w-[calc(var(--spacing-measure)+var(--spacing-flow-indent))] pl-flow-indent
              text-text-primary/85
            `,
            // In a section's box: its tint and corners, and room inside it.
            // The box spans the row; the text inside keeps its measure.
            row.box && cn('max-w-none py-3 pr-4 *:max-w-measure', boxCorners(row.box)),
            !row.box && 'rounded-xl',
            row.box && row.owner.kind === 'segment' && 'pb-3.5'
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

/** A stretch of the rail's line (`--spacing-rail-line`). */
function RailLine({ className }: { className: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute left-rail-line w-px bg-text-primary/15',
        className
      )}
    />
  );
}

function Rail({ rail }: { rail: RailCell }) {
  return (
    <div aria-hidden className="relative w-rail shrink-0">
      {rail.dot ? (
        <>
          {rail.above && <RailLine className="top-0 h-dot-y" />}
          {rail.below && <RailLine className="top-dot-y bottom-0" />}
          {/* On the line, level with the play button. Filled while its track is the one playing. */}
          <span
            className="
              absolute top-dot-y left-rail-center size-2 -translate-1/2 rounded-full border
              border-text-primary/30 group-has-[[data-current-track]]/row:border-accent
              group-has-[[data-current-track]]/row:bg-accent
            "
          />
          {/* The branch, from the dot's edge (half its 8px past the line) to the card. */}
          <span className="absolute top-dot-y right-0 left-[calc(var(--spacing-rail-center)+4px)] h-px bg-text-primary/30" />
        </>
      ) : (
        (rail.above || rail.below) && <RailLine className="inset-y-0" />
      )}
    </div>
  );
}

/**
 * The editor's composer (text or tracks being added there), or its Add zone at
 * the end of the playlist.
 */
function Gap({ at, slots }: { at: GapAt; slots?: ArticleSlots }) {
  const gap = slots?.gap?.(at);
  if (!gap) return null;
  return (
    <div className="rounded-xl border border-dashed border-text-primary/15">
      {/* Its text starts where the flow's writing does, inside the box's 1px border. */}
      {gap.content ? (
        <div className="py-2 pr-3 pl-[calc(var(--spacing-flow-indent)-1px)]">{gap.content}</div>
      ) : (
        gap.control
      )}
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
        // One voice for everything the author wrote (description, sections, text,
        // track notes); metadata around it is smaller and muted.
        'group/prose text-[15px] leading-relaxed text-pretty text-text-primary',
        // Editable, or being edited: raised above a card's play-anywhere button, so a
        // click on the text (or in its field) is the text's, not the card's.
        (open || editing) && 'relative z-10',
        // Editable: above a cell's play-anywhere overlay, and marked as text to click
        // into. An outline drawn outside it, not padding or a margin: hovering (or
        // focusing) moves nothing.
        open &&
          `
            z-10 cursor-text rounded-lg outline-offset-[5px] hover:outline
            hover:outline-text-primary/15 focus-visible:outline-2 focus-visible:outline-accent
          `,
        // Shown as written until the server renders it: dimmed, gently pulsing.
        pending && 'animate-pulse opacity-60 motion-reduce:animate-none',
        className
      )}
      aria-busy={pending || undefined}
      {...(open && {
        tabIndex: 0,
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

/**
 * A card's shell, the track's or the unavailable one's: its border (transparent but
 * an unavailable one's, so content lines up either way), the theme's card padding
 * and gap (which the writing's indent and the rail's dot follow), rounded and
 * filled unless a section's box fills it, and outlined while a drag would group
 * with it.
 */
function Card({
  row,
  box,
  className,
  children,
}: {
  row: { id: string; segmentId: string };
  box: Box | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-row-id={row.id}
      data-segment-id={row.segmentId}
      data-card=""
      className={cn(
        `
          relative flex gap-card-gap border border-transparent py-card-y pr-1.5 pl-card-x
          in-drop-join:ring-2 in-drop-join:ring-accent in-drop-join:ring-inset
        `,
        box?.tone === 'section' ? boxCorners(box) : 'rounded-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

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
    <Card
      row={row}
      box={box}
      className={cn(
        box?.tone !== 'section' && 'bg-text-primary/[0.035]',
        `
          group/cell items-start transition-colors
          hover:bg-text-primary/[0.06]
          has-[[data-current-track]]:bg-accent/10 [&_a,&_button]:relative [&_a,&_button]:z-10
        `
      )}
    >
      <TrackCardPlayer
        // Only what the player reads, once per card (not the show's stats or the note).
        entry={{
          queueKey: row.queueKey,
          track: row.track,
          showId: row.showId,
          date: row.date,
          artistSlug: row.artistSlug,
          artistName: row.artistName,
          venueName: row.venueName,
        }}
        name={name}
        duration={row.songDuration ? durationToHHMMSS(Math.round(row.songDuration)) : '—'}
        menu={slots?.cellMenu?.(row)}
      >
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
      </TrackCardPlayer>
    </Card>
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
    <Card
      row={row}
      box={box}
      className="group/cell items-start border-dashed border-hairline text-text-muted"
    >
      {/* The play button's width, so titles line up. */}
      <span aria-hidden className="w-play-button shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="text-[15px] leading-snug">Unavailable track</span>
        <span className="text-[13px]">This recording isn&rsquo;t on Relisten anymore.</span>
        <Note id={row.id} blocks={row.prose} slots={slots} />
      </div>
      {/* The editor's menu, at the right (readers have none here). */}
      {slots?.cellMenu && <div className="shrink-0">{slots.cellMenu(row)}</div>}
    </Card>
  );
}
