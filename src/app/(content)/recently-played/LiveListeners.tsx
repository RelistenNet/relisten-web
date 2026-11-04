'use client';

import { Link } from '@timber-js/app/client';
import { useState, type ReactNode } from 'react';
import {
  formatListeners,
  formatShowDate,
  type LiveArtist,
  type LiveSummary,
  type MonthDay,
} from '@/lib/live';
import { usePolling } from '@/lib/usePolling';
import { simplePluralize, splitShowDate } from '@/lib/utils';

/** The API's summary window only advances once a minute. */
const POLL_MS = 60_000;
const COLLAPSED_ROWS = 10;

type Props = {
  initialSummary: LiveSummary;
  today: MonthDay;
  /** The "Just started" column, placed beside the list on desktop and above it on phones. */
  feed: ReactNode;
};

export default function LiveListeners({ initialSummary, today, feed }: Props) {
  const [summary, setSummary] = useState(initialSummary);

  // The server render just fetched the summary, so the first poll waits a full interval.
  usePolling(
    async (signal) => {
      const res = await fetch(`/api/live/summary?month=${today.month}&day=${today.day}`, {
        signal,
      });
      if (!res.ok) throw new Error(`live summary: HTTP ${res.status}`);
      setSummary(await res.json());
    },
    POLL_MS,
    { immediate: false }
  );

  const shown = summary.artists.slice(0, COLLAPSED_ROWS);
  const more = summary.artists.slice(COLLAPSED_ROWS);

  return (
    <div className="live-page">
      <h1 className="mb-1 text-3xl font-semibold text-text-primary tabular-nums">
        {formatListeners(summary.listeners)} listening now
      </h1>
      <p className="mb-5 text-sm text-text-muted">
        Estimated from tracks started on Relisten in the last{' '}
        {simplePluralize('minute', summary.windowMinutes)}.
      </p>

      {/* Collapsed, the feed stretches to the list's height so the bottoms line up. With
          "more artists" open the list gets long, so the feed keeps its own height and
          sticks in view instead. */}
      <div
        className="
        group/live grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch
        lg:has-[details[open]]:items-start
      "
      >
        <div
          className="
          flex flex-col lg:col-start-2 lg:row-start-1 lg:group-has-[details[open]]/live:sticky
          lg:group-has-[details[open]]/live:top-4
        "
        >
          {feed}
        </div>

        <div className="lg:col-start-1 lg:row-start-1">
          {/* Matches the "Just started" heading so both cards start on the same line. */}
          <h2 className="mb-2 text-sm font-semibold text-text-primary">Listeners by artist</h2>
          {summary.artists.length === 0 ? (
            <p className="rounded-lg border border-hairline bg-surface px-4 py-8 text-center text-sm text-text-muted">
              Nobody is listening right now.
            </p>
          ) : (
            <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-surface">
              {shown.map((artist) => (
                <ArtistRow key={artist.artistUuid} artist={artist} />
              ))}
              {more.length > 0 && (
                <details className="group/more">
                  <summary
                    className="
                    cursor-pointer list-none px-4 py-2 text-sm text-text-muted transition-colors
                    duration-150 group-open/more:hidden hover:bg-surface-hover
                    hover:text-text-primary [&::-webkit-details-marker]:hidden
                  "
                  >
                    {simplePluralize('more artist', more.length)}
                  </summary>
                  <div className="divide-y divide-hairline">
                    {more.map((artist) => (
                      <ArtistRow key={artist.artistUuid} artist={artist} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const artistHref = ({ artistSlug, topShow }: LiveArtist) => {
  if (!topShow) return `/${artistSlug}`;
  const { year, month, day } = splitShowDate(topShow.displayDate);
  const source = topShow.sourceUuid ? `?source=${topShow.sourceUuid}` : '';
  return `/${artistSlug}/${year}/${month}/${day}${source}`;
};

function ArtistRow({ artist }: { artist: LiveArtist }) {
  const { topShow } = artist;

  return (
    <Link
      href={artistHref(artist)}
      prefetch={false}
      className="group flex items-center px-4 py-2 transition-colors duration-150 hover:bg-surface-hover"
    >
      <div className="mr-4 w-14 shrink-0 text-sm font-semibold text-accent tabular-nums">
        {formatListeners(artist.listeners, { min: 1 })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{artist.artistName}</div>
        {topShow && (
          <div className="truncate text-xs text-text-muted">
            {formatShowDate(topShow.displayDate)}
            {topShow.venueName && ` · ${topShow.venueName}`}
            {topShow.isOnThisDay && <span className="text-accent"> · on this day</span>}
          </div>
        )}
      </div>
      {artist.showCount > 1 && (
        <div className="ml-4 shrink-0 text-xs text-text-muted tabular-nums">
          {simplePluralize('show', artist.showCount)}
        </div>
      )}
    </Link>
  );
}
