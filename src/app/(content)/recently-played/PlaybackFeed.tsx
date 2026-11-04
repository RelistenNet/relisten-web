'use client';

import { Link } from '@timber-js/app/client';
import { useEffect, useState } from 'react';
import TimeAgo from '@/components/TimeAgo';
import { API_DOMAIN } from '@/lib/constants';
import {
  formatShowDate,
  mergePlays,
  nextRevealAt,
  slimPlays,
  tracksPerMinute,
  type LivePlay,
} from '@/lib/live';
import { usePollingState } from '@/lib/usePolling';
import { splitShowDate } from '@/lib/utils';

const POLL_MS = 10_000;

/**
 * Plays reach us in bursts, one batch per poll. Replaying each one at its real
 * start time, shifted back by a little more than the poll interval, turns those
 * bursts into a steady stream at the pace people are actually pressing play.
 */
const REPLAY_LAG_MS = 4_000;
/** Same as the artist list's collapsed length, so rows line up side by side. */
const ROWS = 10;

type Props = {
  /** Newest first. */
  initialPlays: LivePlay[];
  /** Server render time, so the first client render matches the HTML exactly. */
  renderedAt: number;
};

export default function PlaybackFeed({ initialPlays, renderedAt }: Props) {
  // The only per-play stream; CORS-open and small per poll, so the browser reads it directly.
  const plays = usePollingState(
    initialPlays,
    async (signal, current) => {
      const lastSeenId = current[0]?.id;
      const qs = lastSeenId ? `?lastSeenId=${lastSeenId}&limit=200` : '?limit=30';
      const res = await fetch(`${API_DOMAIN}/api/v2/live/history${qs}`, { signal });
      if (!res.ok) throw new Error(`live history: HTTP ${res.status}`);
      return mergePlays(current, slimPlays(await res.json()));
    },
    POLL_MS
  );

  const rows = useRevealedPlays(plays, renderedAt).slice(0, ROWS);

  if (rows.length === 0) return null;
  const rate = tracksPerMinute(plays);

  return (
    <section className="flex flex-1 flex-col">
      <h2 className="mb-2 text-sm font-semibold text-text-primary">Just started</h2>
      {/* Phones get the 3 newest so the artist list still starts near the top. */}
      <div
        className="
          flex flex-1 flex-col divide-y divide-hairline overflow-hidden rounded-lg border
          border-hairline bg-surface max-lg:[&>*:nth-child(n+4):not(:last-child)]:hidden
        "
      >
        {rows.map((play) => (
          <PlaybackRow key={play.id} play={play} serverNow={renderedAt} />
        ))}
        {/* Footer row: matches the list's "more artists" row, and fills the rest of the
            card when it's stretched to the list's height. */}
        <div className="flex-1 px-3 py-2 text-sm text-text-muted tabular-nums">
          {rate !== null && `~${Math.round(rate)} tracks a minute`}
        </div>
      </div>
    </section>
  );
}

/**
 * The plays whose replay time has passed. Re-renders only when the next one
 * comes due (one timer, set for that moment), not on a fixed tick.
 */
function useRevealedPlays(plays: LivePlay[], renderedAt: number) {
  const [revealedUntil, setRevealedUntil] = useState(renderedAt - REPLAY_LAG_MS);
  const dueAt = nextRevealAt(plays, revealedUntil, REPLAY_LAG_MS);

  useEffect(() => {
    if (dueAt === null) return;
    const id = setTimeout(
      () => setRevealedUntil(Date.now() - REPLAY_LAG_MS),
      Math.max(0, dueAt - Date.now())
    );
    return () => clearTimeout(id);
  }, [dueAt]);

  return plays.filter((p) => p.playedAt <= revealedUntil);
}

function PlaybackRow({ play, serverNow }: { play: LivePlay; serverNow: number }) {
  const { year, month, day } = splitShowDate(play.displayDate);

  return (
    <Link
      href={`/${play.artistSlug}/${year}/${month}/${day}/${play.trackSlug}?source=${play.sourceId}`}
      prefetch={false}
      className="
        flex animate-in items-center gap-3 px-3 py-2 transition-colors duration-150 fade-in
        slide-in-from-top-1 hover:bg-surface-hover motion-reduce:animate-none
      "
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-primary">{play.trackTitle}</div>
        <div className="truncate text-xs text-text-muted">
          {play.artistName} · {formatShowDate(play.displayDate)}
        </div>
      </div>
      {/* Counted from when the row appears, not when the track started: the feed replays
          REPLAY_LAG_MS behind, and showing that delay would make a live feed read as stale. */}
      <div className="shrink-0 text-xs text-text-muted tabular-nums">
        <TimeAgo at={play.playedAt + REPLAY_LAG_MS} serverNow={serverNow} />
      </div>
    </Link>
  );
}
