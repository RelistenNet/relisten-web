import type { LiveHistoryItem, TrackSource } from '@/types';
import { removeLeadingZero, splitShowDate } from './utils';

// Shared by the server page (seeding) and the client island (polling), so it
// must stay free of server-only and browser-only imports.

/** Rolling window of track starts the page estimates from. */
export const LIVE_WINDOW_MINUTES = 15;

/** Used when a track has no duration; roughly the site-wide average. */
const FALLBACK_TRACK_SECONDS = 7 * 60;

/**
 * One track start, trimmed down from the ~3.8 KB `live/history` row to what
 * the page renders. Keeps the RSC payload small when seeding hundreds of plays.
 */
export type LivePlay = {
  id: number;
  playedAt: number;
  durationSeconds: number;
  trackTitle: string;
  trackSlug: string;
  sourceId: number;
  showId: number;
  displayDate: string;
  artistUuid: string;
  artistName: string;
  artistSlug: string;
  venueName?: string;
};

// Mirrors the artist feature flags: some artists store venues per show, others per source.
const getVenue = (source: TrackSource) => {
  if (source.artist?.features?.per_show_venues) return source.show?.venue;
  return source.venue ?? source.show?.venue;
};

export function slimPlay(item: LiveHistoryItem): LivePlay | null {
  const source = item.track?.source;
  const track = item.track?.track;
  const artist = source?.artist;
  if (!source || !track || !artist?.slug || !artist.uuid || !source.display_date) return null;

  return {
    id: item.id,
    playedAt: Date.parse(item.created_at),
    durationSeconds: track.duration || FALLBACK_TRACK_SECONDS,
    trackTitle: track.title ?? '',
    trackSlug: track.slug ?? '',
    sourceId: source.id,
    showId: source.show_id ?? source.id,
    displayDate: source.display_date,
    artistUuid: artist.uuid,
    artistName: artist.name ?? artist.slug,
    artistSlug: artist.slug,
    venueName: getVenue(source)?.name,
  };
}

export function slimPlays(items: LiveHistoryItem[] | unknown): LivePlay[] {
  if (!Array.isArray(items)) return [];
  return items.map(slimPlay).filter((p): p is LivePlay => p !== null);
}

/** Merge new plays into the buffer, newest first, dropping duplicates and anything outside the window. */
export function mergePlays(existing: LivePlay[], incoming: LivePlay[], now = Date.now()) {
  const cutoff = now - LIVE_WINDOW_MINUTES * 60_000;
  const seen = new Set<number>();
  return [...incoming, ...existing]
    .filter((p) => p.playedAt >= cutoff && !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.id - a.id);
}

export type LiveArtist = {
  artistUuid: string;
  artistName: string;
  artistSlug: string;
  listeners: number;
  /** The show most of this artist's listeners are on. */
  topShow: {
    displayDate: string;
    venueName?: string;
    sourceId: number;
    isOnThisDay: boolean;
  };
  /** How many different shows this artist's listeners are spread across. */
  showCount: number;
};

export type LiveSummary = {
  listeners: number;
  windowMinutes: number;
  artists: LiveArtist[];
};

/**
 * Estimates how many people are listening, from track starts alone.
 *
 * The API records a row each time a track starts and almost never knows who
 * started it, so listeners can't be counted directly. Little's law gives an
 * estimate instead: people listening ≈ track starts per minute × average
 * track length in minutes. It reads a little high, because skipped tracks are
 * counted as if they were played through, so the page shows it as "~N".
 */
function estimateListeners(plays: LivePlay[], windowMinutes: number) {
  const listenedMinutes = plays.reduce((sum, p) => sum + p.durationSeconds / 60, 0);
  return listenedMinutes / windowMinutes;
}

/** Groups the buffer by artist, with each artist's most-listened show. */
export function summarize(
  buffer: LivePlay[],
  { monthDay, now = Date.now() }: { monthDay: string; now?: number }
): LiveSummary {
  // The buffer is only trimmed when a poll succeeds, so expire old plays here
  // too; otherwise a run of failed polls would keep stale plays in the counts.
  const cutoff = now - LIVE_WINDOW_MINUTES * 60_000;
  const plays = buffer.filter((p) => p.playedAt >= cutoff);
  const oldest = plays.length ? plays[plays.length - 1].playedAt : now;
  const windowMinutes = Math.max(1, Math.min(LIVE_WINDOW_MINUTES, (now - oldest) / 60_000));

  const byArtist = new Map<string, LivePlay[]>();
  for (const p of plays) {
    byArtist.set(p.artistUuid, [...(byArtist.get(p.artistUuid) ?? []), p]);
  }

  const artists = [...byArtist.values()].map((artistPlays): LiveArtist => {
    const byShow = new Map<number, LivePlay[]>();
    for (const p of artistPlays) {
      byShow.set(p.showId, [...(byShow.get(p.showId) ?? []), p]);
    }

    const [topShowPlays] = [...byShow.values()].sort(
      (a, b) => estimateListeners(b, 1) - estimateListeners(a, 1)
    );
    const newest = topShowPlays[0];

    return {
      artistUuid: newest.artistUuid,
      artistName: newest.artistName,
      artistSlug: newest.artistSlug,
      listeners: estimateListeners(artistPlays, windowMinutes),
      topShow: {
        displayDate: newest.displayDate,
        venueName: newest.venueName,
        sourceId: newest.sourceId,
        isOnThisDay: newest.displayDate.slice(5) === monthDay,
      },
      showCount: byShow.size,
    };
  });

  return {
    listeners: estimateListeners(plays, windowMinutes),
    windowMinutes,
    artists: artists.sort((a, b) => b.listeners - a.listeners),
  };
}

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
