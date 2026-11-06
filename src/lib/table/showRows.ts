import type { PlayableTrack, ShowSummary, SongDetail } from '@/domain/types';
import type { Artist } from '@/types';
import { splitShowDate } from '../utils';

// Table rows for detail pages: view models built per request from cached
// domain data (src/data) plus the artist directory. Cheap for a few thousand
// rows, and it keeps per-row strings like links and artist names out of the cache.

export type { PlayableTrack };

/** One show (or, on song pages, one performance) as a table row. */
export type ShowRow = {
  /** Unique per row: the show id, or show + track on song pages (a row per performance). */
  id: string;
  showId: string;
  /** YYYY-MM-DD */
  date: string;
  year: string;
  artistName: string;
  artistSlug: string;
  venueName?: string;
  /** The venue page's slug (canonical slug, or an imported venue's id). */
  venueSlug?: string;
  location?: string;
  tourName?: string;
  tapes: number;
  sbd: boolean;
  /** Average tape rating; null when no tape has ratings. */
  rating: number | null;
  /** Plays over the last 30 days. */
  plays30d: number;
  /** When the show first appeared on Relisten (ISO). */
  addedAt: string;
  /** The show page. */
  href: string;
  /** Song pages only: this performance's length, in seconds. */
  songDuration?: number | null;
  /** Song pages only: the length is from files that also hold other songs (a segue). */
  songDurationApprox?: boolean;
  /** Song pages only: the matched file's full title ("Scarlet Begonias > Fire on the Mountain"). */
  trackTitle?: string;
  /** Song pages only: this performance's file, playable in place. */
  track?: PlayableTrack;
  /** Song pages only, when the song was played more than once in the show: which one. */
  performance?: { index: number; of: number };
};

/** Artists by id, from the artist directory. */
export type ArtistsById = ReadonlyMap<string, Artist>;

export function showRow(show: ShowSummary, artists: ArtistsById): ShowRow | null {
  const artist = artists.get(show.artistId);
  if (!artist?.slug) return null;
  const { year, month, day } = splitShowDate(show.date);
  return {
    id: show.id,
    showId: show.id,
    date: show.date,
    year,
    artistName: artist.name ?? artist.slug,
    artistSlug: artist.slug,
    venueName: show.venue?.name,
    venueSlug: show.venue?.slug,
    location: show.venue?.location,
    tourName: show.tourName,
    tapes: show.tapes,
    sbd: show.sbd,
    rating: show.rating,
    plays30d: show.plays30d,
    addedAt: show.addedAt,
    href: `/${artist.slug}/${year}/${month}/${day}`,
  };
}

export const showRows = (shows: ShowSummary[], artists: ArtistsById): ShowRow[] =>
  shows.flatMap((show) => showRow(show, artists) ?? []);

/** A song's performances as rows: one per time played. */
export const songRows = (song: SongDetail, artists: ArtistsById): ShowRow[] =>
  song.performances.flatMap((p) => {
    const row = showRow(p.show, artists);
    if (!row) return [];
    return [
      {
        ...row,
        id: p.repeat ? `${row.showId}:${p.track?.id}` : row.showId,
        track: p.track,
        trackTitle: p.track?.title,
        songDuration: p.duration,
        songDurationApprox: p.durationApprox,
        performance: p.repeat,
      },
    ];
  });
