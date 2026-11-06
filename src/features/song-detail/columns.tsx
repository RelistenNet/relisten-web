import Tooltip from '@/ui/base/Tooltip';
import { durationToHHMMSS } from '@/lib/utils';
import type { ShowRow } from '@/ui/shows/rows';
import type { Column } from '@/ui/table/types';
import PlayTrackButton from './PlayTrackButton';

// Columns only song pages have: playing a performance in place, and its length.

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
          track={r.track}
          artistSlug={r.artistSlug}
          artistName={r.artistName}
          date={r.date}
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

export const lengthColumn: Column<ShowRow> = {
  id: 'length',
  width: 'w-24',
  label: 'Length',
  sortable: true,
  firstDir: 'desc',
  align: 'right',
  // "~": measured from files that also hold other songs (a segue), so it runs long.
  // The tooltip names the whole file, so it's clear what the "~" length covers.
  cell: (r) => {
    if (!r.songDuration) return '—';
    const length = durationToHHMMSS(Math.round(r.songDuration));
    if (!r.songDurationApprox) return length;
    return (
      <Tooltip
        content={r.trackTitle ?? 'Measured from a file that includes other songs'}
        align="left"
      >
        <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4">
          ~{length}
        </span>
      </Tooltip>
    );
  },
};
