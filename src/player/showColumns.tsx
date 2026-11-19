import type { ShowRow } from '@/ui/shows/rows';
import type { Column } from '@/ui/table/types';
import QueueButtons, { PlayShowButton } from './QueueButtons';
import QueueMenu from './QueueMenu';

// Columns for tables of shows (an artist's shows, a tour, a venue): playing or
// queueing a whole show. The rows carry no tracks; the buttons fetch them.

const showName = (r: ShowRow) => [r.date, r.venueName].filter(Boolean).join(' at ');

/** Play the show (its first tape), then (from sm up) Play next and Add to queue beside it. */
export const playShowColumn: Column<ShowRow> = {
  id: 'play',
  width: 'w-14 sm:w-28',
  label: 'Play',
  srOnlyLabel: true,
  cell: (r) => (
    <div className="flex items-center gap-1">
      <PlayShowButton showId={r.showId} name={showName(r)} />
      <QueueButtons showId={r.showId} name={showName(r)} className="max-sm:hidden" />
    </div>
  ),
};

/** Narrow screens: Play next / Add to queue in a menu, as there's no room beside Play. */
export const queueShowColumn: Column<ShowRow> = {
  id: 'queue',
  width: 'w-14',
  label: 'Queue',
  srOnlyLabel: true,
  align: 'right',
  showBelow: 'sm',
  cell: (r) => <QueueMenu showId={r.showId} name={showName(r)} />,
};
