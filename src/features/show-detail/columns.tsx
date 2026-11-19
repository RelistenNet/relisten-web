import QueueButtons from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
import { songLinks, songRowItem } from '@/player/queue/items';
import PlayTrackButton from '@/player/PlayTrackButton';
import TrackLoadTag from '@/player/TrackLoadTag';
import { showColumns } from '@/ui/shows/columns';
import type { Column } from '@/ui/table/types';
import type { ShowTrackRow } from './spec';

// Columns for a show page's track table, which always lists the tape in play
// order: none of them sort. Length is shared (showColumns.length, unsorted here).

/** Play, then (from sm up) Play next and Add to queue beside it. The menu stays for the song links. */
export const playColumn: Column<ShowTrackRow> = {
  id: 'play',
  width: 'w-14 sm:w-28',
  label: 'Play',
  srOnlyLabel: true,
  cell: (r) =>
    r.track ? (
      <div className="flex items-center gap-1">
        <PlayTrackButton row={r} track={r.track} label={`Play ${r.trackTitle ?? r.position}`} />
        {r.track.mp3Url && (
          <QueueButtons
            item={songRowItem(r)}
            name={r.trackTitle ?? `Track ${r.position}`}
            className="max-sm:hidden"
          />
        )}
      </div>
    ) : null,
};

export const titleColumn: Column<ShowTrackRow> = {
  id: 'title',
  label: 'Song',
  // Plain text: a row click plays the track (rowAction).
  cell: (r) => <span className="font-medium">{r.trackTitle ?? '—'}</span>,
};

/**
 * The shared length column, without its sort, with the track's load state
 * (GAPLESS / LOADING / ERROR) to its left. The time is at least "00:00" wide,
 * so the tags line up down the table.
 */
export const lengthColumn: Column<ShowTrackRow> = {
  ...showColumns.length,
  sortable: false,
  width: 'w-24 sm:w-40',
  cell: (r) => (
    <span className="inline-flex items-center justify-end gap-1">
      {r.track && <TrackLoadTag trackId={r.track.id} className="max-sm:hidden" />}
      <span className="inline-block min-w-[5ch] text-right">{showColumns.length.cell(r)}</span>
    </span>
  ),
};

/** Play next / Add to queue for a track, and links to its songs' pages. */
export const queueColumn: Column<ShowTrackRow> = {
  id: 'queue',
  width: 'w-14',
  label: 'Queue',
  srOnlyLabel: true,
  align: 'right',
  cell: (r) => <QueueMenu item={songRowItem(r)} links={songLinks(r.artistSlug, r.songs)} />,
};
