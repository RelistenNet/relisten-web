'use client';

import { Link } from '@timber-js/app/client';
import { API_DOMAIN } from '@/lib/constants';
import { formatShowDate, mergePlays, slimPlays, type LivePlay } from '@/lib/live';
import { useNow } from '@/lib/useNow';
import { usePollingState } from '@/lib/usePolling';
import { splitShowDate } from '@/lib/utils';

const POLL_MS = 10_000;

/**
 * Plays reach us in bursts, one batch per poll. Replaying each one at its real
 * start time, shifted back by a little more than the poll interval, turns those
 * bursts into a steady stream at the pace people are actually pressing play.
 */
const REPLAY_LAG_MS = 15_000;
const TICK_MS = 500;
/** Same as the artist list's collapsed length, so rows line up side by side. */
const ROWS = 10;

type Props = {
  /** Newest first. */
  initialPlays: LivePlay[];
  /** Server render time, so the first client render matches the HTML exactly. */
  renderedAt: number;
};

export default function PlaybackFeed({ initialPlays, renderedAt }: Props) {
  const now = useNow(TICK_MS, renderedAt);

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

  const replayTime = now - REPLAY_LAG_MS;
  const rows = plays.filter((p) => p.playedAt <= replayTime).slice(0, ROWS);

  if (rows.length === 0) return null;

  return (
    <section className="flex flex-1 flex-col">
      <h2 className="mb-2 text-sm font-semibold text-text-primary">Just started</h2>
      {/* Phones get the 3 newest so the artist list still starts near the top. */}
      <div
        className="
        flex-1 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-surface
        max-lg:[&>*:nth-child(n+4)]:hidden
      "
      >
        {rows.map((play) => (
          <PlaybackRow key={play.id} play={play} replayTime={replayTime} />
        ))}
      </div>
    </section>
  );
}

function PlaybackRow({ play, replayTime }: { play: LivePlay; replayTime: number }) {
  const { year, month, day } = splitShowDate(play.displayDate);
  const secondsAgo = Math.max(0, Math.round((replayTime - play.playedAt) / 1000));

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
      <div className="shrink-0 text-xs text-text-muted tabular-nums">{secondsAgo}s</div>
    </Link>
  );
}
