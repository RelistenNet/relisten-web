import { numberFormat, removeLeadingZero, splitShowDate } from './utils';

// Shared by the server page, the summary route, and the client island, so it
// must stay free of server-only and browser-only imports.

// ---------------------------------------------------------------------------
// Listener summary (from GET /api/v4/live/summary, joined with the artist directory)
// ---------------------------------------------------------------------------

/**
 * The live summary as the server hands it over: v4's summary, trimmed and joined
 * with the artist directory (v4 rows carry only artist ids).
 */
type ApiLiveSummaryArtist = {
  artist_id: string;
  name: string;
  slug: string;
  listened_seconds: number;
  show_count: number;
  top_show: {
    listened_seconds: number;
    display_date: string;
    venue_name?: string;
    /** `?source=` value for the show page. */
    source_param: string;
  } | null;
};

export type ApiLiveSummary = {
  window_minutes: number;
  listened_seconds: number;
  artists: ApiLiveSummaryArtist[];
};

export type LiveArtist = {
  artistId: string;
  artistName: string;
  artistSlug: string;
  listeners: number;
  /** The artist's show with the most listening in the window. */
  topShow: {
    /** Estimated listeners on this show alone (a share of the artist's total). */
    listeners: number;
    displayDate: string;
    venueName?: string;
    /** `?source=` value for the show page. */
    sourceParam?: string;
    isOnThisDay: boolean;
  } | null;
  /** How many different shows this artist's listeners are spread across. */
  showCount: number;
};

export type LiveSummary = {
  listeners: number;
  windowMinutes: number;
  artists: LiveArtist[];
};

/**
 * People listening ≈ listened time ÷ window length (Little's law). The API sums
 * the durations of every track started in the window; a skipped track counts as
 * played through, so this reads a little high and the page shows it as "~N".
 */
const toListeners = (listenedSeconds: number, windowMinutes: number) =>
  listenedSeconds / 60 / Math.max(1, windowMinutes);

/**
 * Trims the summary to what the page renders.
 */
export function slimSummary(api: ApiLiveSummary | null, today: MonthDay): LiveSummary {
  if (!api) return { listeners: 0, windowMinutes: 0, artists: [] };
  const monthDay = toMonthDay(today);

  const artists = api.artists
    .map((a): LiveArtist => {
      const top = a.top_show;
      return {
        artistId: a.artist_id,
        artistName: a.name,
        artistSlug: a.slug,
        listeners: toListeners(a.listened_seconds, api.window_minutes),
        topShow: top
          ? {
              listeners: toListeners(top.listened_seconds, api.window_minutes),
              displayDate: top.display_date,
              venueName: top.venue_name,
              sourceParam: top.source_param,
              isOnThisDay: top.display_date.slice(5) === monthDay,
            }
          : null,
        showCount: a.show_count,
      };
    })
    .sort((a, b) => b.listeners - a.listeners);

  return {
    listeners: toListeners(api.listened_seconds, api.window_minutes),
    windowMinutes: api.window_minutes,
    artists,
  };
}

/** Today in the viewer's timezone, for "on this day". */
export type MonthDay = { month: number; day: number };

/** "11-03": the API's `month_day` format, and the tail of a show's display_date. */
export const toMonthDay = ({ month, day }: MonthDay) =>
  `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// "Just started" feed (from GET /api/v4/live/history, via /api/live/history)
// ---------------------------------------------------------------------------

/** How many recent plays the feed keeps around. */
const FEED_BUFFER = 100;

/** One track start, trimmed to what the feed renders. */
export type LivePlay = {
  /** The API's play sequence number: increases with every play. */
  id: number;
  playedAt: number;
  trackTitle: string;
  trackSlug: string;
  /** `?source=` value for the show page. */
  sourceParam: string;
  displayDate: string;
  artistName: string;
  artistSlug: string;
};

/** Merge new plays into the feed buffer, newest first, without duplicates. */
export function mergePlays(existing: LivePlay[], incoming: LivePlay[]) {
  const seen = new Set<number>();
  return [...incoming, ...existing]
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.id - a.id)
    .slice(0, FEED_BUFFER);
}

/** Fewer buffered plays than this, or a shorter span, is too little to quote a rate from. */
const MIN_RATE_PLAYS = 10;
const MIN_RATE_SPAN_MS = 15_000;

/**
 * Tracks started per minute, from the feed's buffered plays (newest first). The
 * buffer holds the latest ~100 plays, about the last minute at current volume.
 * Null until there's enough to say.
 */
export function tracksPerMinute(plays: LivePlay[]): number | null {
  if (plays.length < MIN_RATE_PLAYS) return null;
  const spanMs = plays[0].playedAt - plays[plays.length - 1].playedAt;
  if (spanMs < MIN_RATE_SPAN_MS) return null;
  // n plays span n - 1 gaps.
  return ((plays.length - 1) / spanMs) * 60_000;
}

/**
 * When the next not-yet-revealed play comes due, or null if none is waiting.
 * The feed shows a play once `playedAt + lagMs` has passed; `revealedUntil` is
 * the latest start time already shown. Plays are newest first.
 */
export function nextRevealAt(plays: LivePlay[], revealedUntil: number, lagMs: number) {
  const next = plays.findLast((p) => p.playedAt > revealedUntil);
  return next ? next.playedAt + lagMs : null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** 11/3/84 — compact, since the artist name carries the context. */
export const formatShowDate = (displayDate: string) => {
  const { year, month, day } = splitShowDate(displayDate);
  return `${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)}`;
};

/**
 * "~350". Pass `min: 1` for artist rows: an artist in the list has at least one
 * track going, so it shouldn't round down to nothing. The site-wide total keeps
 * a real zero, shown without the "~".
 */
export const formatListeners = (n: number, { min = 0 }: { min?: number } = {}) => {
  const rounded = Math.max(min, Math.round(n));
  return rounded === 0 ? '0' : `~${numberFormat.format(rounded)}`;
};
