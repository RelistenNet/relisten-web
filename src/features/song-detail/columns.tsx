import type { ShowRow } from '@/ui/shows/rows';
import type { Column } from '@/ui/table/types';
import PlayTrackButton from '@/player/PlayTrackButton';
import QueueButtons from '@/player/QueueButtons';
import QueueMenu from '@/player/QueueMenu';
import { songRowItem } from '@/player/queue/items';

// Columns only song pages have: playing a performance in place, and queueing it.

/** Play, then (from sm up) Play next and Add to queue beside it. */
export const playColumn: Column<ShowRow> = {
  id: 'play',
  width: 'w-14 sm:w-28',
  label: 'Play',
  srOnlyLabel: true,
  // "3 of 6" under the button when the song was played more than once in the show.
  cell: (r) =>
    r.track ? (
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <PlayTrackButton
            row={r}
            track={r.track}
            label={`Play ${r.date}${r.performance ? ` (${r.performance.index} of ${r.performance.of})` : ''}`}
          />
          {r.performance && (
            <div className="text-xs text-text-muted">
              {r.performance.index} of {r.performance.of}
            </div>
          )}
        </div>
        {r.track.mp3Url && (
          <QueueButtons
            item={songRowItem(r)}
            name={`${r.trackTitle ?? r.date}, ${r.date}`}
            className="max-sm:hidden"
          />
        )}
      </div>
    ) : null,
};

/** Narrow screens: Play next / Add to queue in a menu, as there's no room beside Play. */
export const queueColumn: Column<ShowRow> = {
  id: 'queue',
  width: 'w-14',
  label: 'Queue',
  srOnlyLabel: true,
  align: 'right',
  showBelow: 'sm',
  cell: (r) => <QueueMenu item={songRowItem(r)} />,
};
