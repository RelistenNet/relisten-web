import type { LiveHistoryItem, TrackSource } from '@/types';
import { removeLeadingZero, splitShowDate } from './utils';

// Shared by the server page, the summary route, and the client island, so it
// must stay free of server-only and browser-only imports.

// ---------------------------------------------------------------------------
// Listener summary (from GET /api/v3/live/summary)
// ---------------------------------------------------------------------------

/** The fields of the v3 live summary this page reads; the response has many more. */
type ApiLiveSummaryShow = {
  listened_seconds: number;
  source: TrackSource & { uuid?: string };
};

type ApiLiveSummaryArtist = {
  artist_uuid: string;
  name: string;
  slug: string;
  listened_seconds: number;
  show_count: number;
  top_show: ApiLiveSummaryShow | null;
};

export type ApiLiveSummary = {
  window_minutes: number;
  listened_seconds: number;
  artists: ApiLiveSummaryArtist[];
};

export type LiveArtist = {
  artistUuid: string;
  artistName: string;
  artistSlug: string;
  listeners: number;
  /** The artist's show with the most listening in the window. */
  topShow: {
    /** Estimated listeners on this show alone (a share of the artist's total). */
    listeners: number;
    displayDate: string;
    venueName?: string;
    /** Source uuid; the show page's `?source=` accepts it. */
    sourceUuid?: string;
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

// Mirrors the artist feature flags: some artists store venues per show, others per source.
const getVenue = (source: TrackSource) => {
  if (source.artist?.features?.per_show_venues) return source.show?.venue;
  return source.venue ?? source.show?.venue;
};

/**
 * Trims the summary to what the page renders. Each artist's top show carries a
 * full source object (~3 KB), which shouldn't be shipped to the browser.
 */
export function slimSummary(api: ApiLiveSummary | null, today: MonthDay): LiveSummary {
  if (!api) return { listeners: 0, windowMinutes: 0, artists: [] };
  const monthDay = toMonthDay(today);

  const artists = api.artists
    .map((a): LiveArtist => {
      const source = a.top_show?.source;
      return {
        artistUuid: a.artist_uuid,
        artistName: a.name,
        artistSlug: a.slug,
        listeners: toListeners(a.listened_seconds, api.window_minutes),
        topShow: source?.display_date
          ? {
              listeners: toListeners(a.top_show?.listened_seconds ?? 0, api.window_minutes),
              displayDate: source.display_date,
              venueName: getVenue(source)?.name,
              sourceUuid: source.uuid,
              isOnThisDay: source.display_date.slice(5) === monthDay,
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
// "Just started" feed (from GET /api/v2/live/history)
// ---------------------------------------------------------------------------

/** How many recent plays the feed keeps around. */
const FEED_BUFFER = 100;

/** One track start, trimmed from the ~3.8 KB `live/history` row to what the feed renders. */
export type LivePlay = {
  id: number;
  playedAt: number;
  trackTitle: string;
  trackSlug: string;
  sourceId: number;
  displayDate: string;
  artistName: string;
  artistSlug: string;
};

export function slimPlay(item: LiveHistoryItem): LivePlay | null {
  const source = item.track?.source;
  const track = item.track?.track;
  const artist = source?.artist;
  if (!source || !track || !artist?.slug || !source.display_date) return null;

  return {
    id: item.id,
    playedAt: Date.parse(item.created_at),
    trackTitle: track.title ?? '',
    trackSlug: track.slug ?? '',
    sourceId: source.id,
    displayDate: source.display_date,
    artistName: artist.name ?? artist.slug,
    artistSlug: artist.slug,
  };
}

export function slimPlays(items: LiveHistoryItem[] | unknown): LivePlay[] {
  if (!Array.isArray(items)) return [];
  return items.map(slimPlay).filter((p): p is LivePlay => p !== null);
}

/** Merge new plays into the feed buffer, newest first, without duplicates. */
export function mergePlays(existing: LivePlay[], incoming: LivePlay[]) {
  const seen = new Set<number>();
  return [...incoming, ...existing]
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.id - a.id)
    .slice(0, FEED_BUFFER);
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
  return rounded === 0 ? '0' : `~${rounded.toLocaleString()}`;
};
