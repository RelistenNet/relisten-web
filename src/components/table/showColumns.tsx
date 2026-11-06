import { Link } from '@timber-js/app/client';
import type { ShowRow } from '@/lib/table/showRows';
import type { TableFilter, TableSpec } from '@/lib/table/query';
import { durationToHHMMSS, numberFormat } from '@/lib/utils';
import Tag from '@/components/Tag';
import { formatShowDate } from '@/lib/table/showStats';
import Tooltip from '@/components/Tooltip';
import PlayTrackButton from './PlayTrackButton';
import type { Column } from './types';
import { venueUrl } from '@/lib/urls';

// Columns, sorts, and filters shared by every table of shows (venue pages, song
// pages). Each page picks the columns it needs.

export const showColumns = {
  date: {
    id: 'date',
    width: 'w-40',
    label: 'Date',
    sortable: true,
    firstDir: 'desc',
    cell: (r) => (
      <span className="inline-flex items-center gap-1">
        <Link href={r.href} className="text-accent hover:underline">
          {r.date}
        </Link>
        {r.sbd && <Tag>SBD</Tag>}
      </span>
    ),
  },
  /** Song pages: plays this performance's track. */
  play: {
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
  },
  /** Date, venue, and location in one cell, sortable by date or venue. */
  show: {
    id: 'show',
    label: 'Show',
    sorts: [
      { id: 'date', label: 'Date', firstDir: 'desc' },
      { id: 'venue', label: 'Venue' },
    ],
    cell: (r) => (
      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1">
          <Link href={r.href} className="text-accent hover:underline">
            {r.date}
          </Link>
          {r.sbd && <Tag>SBD</Tag>}
        </span>
        <span
          className="truncate text-text-muted"
          title={[r.venueName, r.location].filter(Boolean).join(' · ')}
        >
          {r.venueName && r.venueSlug ? (
            <Link
              href={venueUrl(r.venueSlug, r.artistSlug)}
              className="hover:text-text-primary hover:underline"
            >
              {r.venueName}
            </Link>
          ) : (
            (r.venueName ?? '—')
          )}
          {r.location && ` · ${r.location}`}
        </span>
      </div>
    ),
  },
  artist: {
    id: 'artist',
    label: 'Artist',
    sortable: true,
    cell: (r) => (
      <Link href={`/${r.artistSlug}`} className="hover:underline">
        {r.artistName}
      </Link>
    ),
  },
  length: {
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
  },
  added: {
    id: 'added',
    width: 'w-32',
    label: 'Added',
    sortable: true,
    firstDir: 'desc',
    cell: (r) => formatShowDate(r.addedAt.slice(0, 10)),
  },
  tapes: {
    id: 'tapes',
    width: 'w-20',
    label: 'Tapes',
    sortable: true,
    firstDir: 'desc',
    align: 'right',
    cell: (r) => r.tapes,
  },
  rating: {
    id: 'rating',
    width: 'w-20',
    label: 'Rating',
    sortable: true,
    firstDir: 'desc',
    align: 'right',
    hideBelow: 'sm',
    cell: (r) => (r.rating === null ? '—' : r.rating.toFixed(1)),
  },
  plays: {
    id: 'plays',
    width: 'w-28',
    label: 'Plays (30d)',
    sortable: true,
    firstDir: 'desc',
    align: 'right',
    hideBelow: 'sm',
    cell: (r) => numberFormat.format(r.plays30d),
  },
} satisfies Record<string, Column<ShowRow>>;

export const showSorts: TableSpec<ShowRow>['sorts'] = {
  date: (r) => r.date,
  artist: (r) => r.artistName,
  venue: (r) => r.venueName,
  length: (r) => r.songDuration,
  added: (r) => r.addedAt,
  tapes: (r) => r.tapes,
  rating: (r) => r.rating,
  plays: (r) => r.plays30d,
};

export const showSearchText = (r: ShowRow) =>
  [r.date, r.artistName, r.venueName, r.location].filter(Boolean).join(' ');

export const showFilters = {
  year: {
    kind: 'select',
    id: 'year',
    label: 'Year',
    value: (r) => r.year,
    optionOrder: 'value-desc',
  },
  sbd: { kind: 'toggle', id: 'sbd', label: 'Soundboard only', test: (r) => r.sbd },
} satisfies Record<string, TableFilter<ShowRow>>;
