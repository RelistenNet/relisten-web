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
/**
 * Rows rendered beyond the visible ones. A new row grows in at the top and pushes the
 * others down; these extra rows sit under the clipped bottom edge, so the last visible
 * row slides out instead of vanishing, even when several plays land at once.
 */
const OVERFLOW_ROWS = 4;

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

  const rows = useRevealedPlays(plays, renderedAt).slice(0, ROWS + OVERFLOW_ROWS);
  // Rows on screen at first render are already in place; only later ones animate in.
  const initialCutoff = renderedAt - REPLAY_LAG_MS;

  if (rows.length === 0) return null;
  const rate = tracksPerMinute(plays);

  return (
    <section className="flex flex-1 flex-col">
      <h2 className="mb-2 text-sm font-semibold text-text-primary">Just started</h2>
      <div
        className="
          flex flex-1 flex-col divide-y divide-hairline overflow-hidden rounded-lg border
          border-hairline bg-surface
        "
      >
        {/* Clipped to exactly ROWS rows (3 on phones, so the artist list still starts near
            the top). A row is 3.25rem (py-2 + a text-sm and a text-xs line) plus a 1px
            divider, the same as the artist list's rows. Plays are never queued or paced:
            each appears when it comes due, and a burst slides in together. A fixed height,
            not max-height: a burst starts at zero height, and the box must not shrink. */}
        <div
          className="
            h-[calc(3*(3.25rem+1px)-1px)] divide-y divide-hairline overflow-hidden
            lg:h-[calc(10*(3.25rem+1px)-1px)]
          "
        >
          {rows.map((play) => (
            <div key={play.id} className={play.playedAt > initialCutoff ? 'live-row-enter' : ''}>
              <div className="min-h-0 overflow-hidden">
                <PlaybackRow play={play} serverNow={renderedAt} />
              </div>
            </div>
          ))}
        </div>
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
      className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-surface-hover"
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
