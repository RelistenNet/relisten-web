import QueueButtons from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
import { songLinks, songRowItem } from '@/player/queue/items';
import PlayTrackButton from '@/player/PlayTrackButton';
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

/** The shared length column, without its sort. */
export const lengthColumn: Column<ShowTrackRow> = { ...showColumns.length, sortable: false };

/** Play next / Add to queue for a track, and links to its songs' pages. */
export const queueColumn: Column<ShowTrackRow> = {
  id: 'queue',
  width: 'w-14',
  label: 'Queue',
  srOnlyLabel: true,
  align: 'right',
  cell: (r) => <QueueMenu item={songRowItem(r)} links={songLinks(r.artistSlug, r.songs)} />,
};
