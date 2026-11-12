import type { ShowRow } from '@/ui/shows/rows';
import type { Column } from '@/ui/table/types';
import PlayTrackButton from '@/player/PlayTrackButton';
import QueueMenu from '@/player/QueueMenu';
import { songRowItem } from '@/player/queue/items';
import { href } from '@timber-js/app/routes';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';

// Columns only song pages have: playing a performance in place, and queueing it.

export const playColumn: Column<ShowRow> = {
  id: 'play',
  width: 'w-14',
  label: 'Play',
  srOnlyLabel: true,
  // "3 of 6" under the button when the song was played more than once in the show.
  cell: (r) =>
    r.track ? (
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
    ) : null,
};

/** Play next / Add to queue for a performance, and a link to its show (on the performance's tape). */
export const queueColumn: Column<ShowRow> = {
  id: 'queue',
  width: 'w-14',
  label: 'Queue',
  srOnlyLabel: true,
  align: 'right',
  cell: (r) => (
    <QueueMenu
      item={songRowItem(r)}
      links={[
        {
          label: 'View show',
          href: href(
            '/artists/[artistSlug]/shows/[showDate]',
            { artistSlug: r.artistSlug, showDate: r.date },
            sourceQuery(r.track?.sourceId)
          ),
        },
      ]}
    />
  ),
};
