import { Link } from '@timber-js/app/client';
import QueueMenu from '@/player/QueueMenu';
import { songLinks, songRowItem } from '@/player/queue/items';
import PlayTrackButton from '@/player/PlayTrackButton';
import type { Column } from '@/ui/table/types';
import type { ShowTrackRow } from './spec';

// Columns for a show page's track table. Length is shared (showColumns.length).

export const playColumn: Column<ShowTrackRow> = {
  id: 'play',
  width: 'w-14',
  label: 'Play',
  srOnlyLabel: true,
  cell: (r) =>
    r.track ? (
      <PlayTrackButton row={r} track={r.track} label={`Play ${r.trackTitle ?? r.position}`} />
    ) : null,
};

export const positionColumn: Column<ShowTrackRow> = {
  id: 'position',
  width: 'w-14',
  label: '#',
  sortable: true,
  align: 'right',
  cell: (r) => <span className="text-text-muted tabular-nums">{r.position}</span>,
};

export const titleColumn: Column<ShowTrackRow> = {
  id: 'title',
  label: 'Song',
  sortable: true,
  cell: (r) => (
    <Link href={r.href} className="font-medium hover:underline">
      {r.trackTitle ?? '—'}
    </Link>
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
