'use client';

import { Link } from '@timber-js/app/client';
import { useState } from 'react';
import cn from '@/lib/cn';
import { API_DOMAIN } from '@/lib/constants';
import {
  formatListeners,
  formatShowDate,
  mergePlays,
  slimPlays,
  type LiveArtist,
  type LivePlay,
  type LiveSummary,
} from '@/lib/live';
import { usePolling } from '@/lib/usePolling';
import PlaybackFeed from './PlaybackFeed';
import { simplePluralize, splitShowDate } from '@/lib/utils';

/** The feed wants new plays quickly; the summary's window only advances once a minute. */
const FEED_POLL_MS = 10_000;
const SUMMARY_POLL_MS = 60_000;
const COLLAPSED_ROWS = 10;

type Props = {
  initialSummary: LiveSummary;
  initialPlays: LivePlay[];
  /** MM-DD in the viewer's timezone, for "on this day". */
  monthDay: string;
  /** Server render time, so the first client render matches the HTML exactly. */
  renderedAt: number;
};

export default function LiveNow({ initialSummary, initialPlays, monthDay, renderedAt }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [plays, setPlays] = useState(initialPlays);
  const [expanded, setExpanded] = useState(false);

  usePolling(async (signal) => {
    const res = await fetch(`/api/live/summary?month_day=${monthDay}`, { signal });
    if (res.ok) setSummary(await res.json());
  }, SUMMARY_POLL_MS);

  usePolling(async (signal) => {
    const lastSeenId = plays[0]?.id;
    const qs = lastSeenId ? `?lastSeenId=${lastSeenId}&limit=200` : '?limit=30';
    const res = await fetch(`${API_DOMAIN}/api/v2/live/history${qs}`, { signal });
    const incoming = slimPlays(await res.json());
    setPlays((prev) => mergePlays(prev, incoming));
  }, FEED_POLL_MS);
  const visible = expanded ? summary.artists : summary.artists.slice(0, COLLAPSED_ROWS);
  const hiddenCount = summary.artists.length - visible.length;

  return (
    <div className="live-page">
      <h1 className="mb-1 text-3xl font-semibold text-text-primary tabular-nums">
        {formatListeners(summary.listeners)} listening now
      </h1>
      <p className="mb-5 text-sm text-text-muted">
        Estimated from tracks started on Relisten in the last{' '}
        {simplePluralize('minute', Math.round(summary.windowMinutes))}.
      </p>

      {/* Feed beside the list on desktop; above it (trimmed) on phones, so both sit above the fold. */}
      {/* Collapsed, the feed stretches to the list's height so the bottoms line up; expanded,
          the list gets long, so the feed keeps its own height and sticks in view instead. */}
      <div
        className={cn(
          'grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]',
          expanded ? 'lg:items-start' : 'lg:items-stretch'
        )}
      >
        <div
          className={cn(
            'flex flex-col lg:col-start-2 lg:row-start-1',
            expanded && 'lg:sticky lg:top-4'
          )}
        >
          <PlaybackFeed plays={plays} renderedAt={renderedAt} />
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
              {visible.map((artist) => (
                <ArtistRow key={artist.artistUuid} artist={artist} />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="
                w-full cursor-pointer px-4 py-2 text-left text-sm text-text-muted transition-colors
                duration-150 hover:bg-surface-hover hover:text-text-primary
              "
                >
                  {simplePluralize('more artist', hiddenCount)}
                </button>
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
