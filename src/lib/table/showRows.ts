import type { ShowSummaryResource } from '../v4/generated/model';
import { showVenue } from '../v4/adapters';
import type { ArtistDirectory } from '../v4/artistDirectory';
import { splitShowDate } from '../utils';

/** One file of a song performance, with what the player needs to play it. */
export type PlayableTrack = {
  id: string;
  title: string;
  slug: string;
  mp3Url: string | null;
  duration: number | null;
  sourceId: string;
};

/** One show as a detail-page table row: flat, so sorting and search are cheap. */
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
  /** The show page. */
  href: string;
  /** Song pages only: this performance's file, playable in place. */
  track?: PlayableTrack;
  /** Song pages only: this performance's length, in seconds. */
  songDuration?: number | null;
  /**
   * Song pages only: the length comes from files that also hold other songs
   * (a segue like "Scarlet > Fire"), so it overstates the song itself.
   */
  songDurationApprox?: boolean;
  /** Song pages only: the matched file's full title ("Scarlet Begonias > Fire on the Mountain"). */
  trackTitle?: string;
  /** Song pages only, when the song was played more than once in the show: which one. */
  performance?: { index: number; of: number };
};

export function toShowRow(show: ShowSummaryResource, directory: ArtistDirectory): ShowRow | null {
  const artist = directory.byId.get(show.artist_id);
  const date = show.display_date;
  if (!artist?.slug || !date) return null;
  const { year, month, day } = splitShowDate(date);
  const venue = showVenue(show);
  return {
    id: show.id,
    showId: show.id,
    date,
    year,
    artistName: artist.name ?? artist.slug,
    artistSlug: artist.slug,
    venueName: venue?.name,
    venueSlug: venue?.slug,
    location: venue?.location,
    tourName:
      show.tour?.name && show.tour.name !== 'Not Part of a Tour' ? show.tour.name : undefined,
    tapes: show.source_count,
    sbd: show.has_soundboard_source,
    rating: show.avg_rating > 0 ? show.avg_rating : null,
    plays30d: show.popularity?.windows?.['30d']?.plays ?? 0,
    href: `/${artist.slug}/${year}/${month}/${day}`,
  };
}
