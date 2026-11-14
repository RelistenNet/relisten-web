import type { ShowDetail, Source, SourceSet, Track } from '@/domain/types';
import type { SortableSource } from './sortSources';

// A show page's songs and sources columns are separate slots, each serialized
// to the client on its own (twice the show, with the client segment cache).
// Each column gets only the fields it reads. A field a column starts reading
// has to be added here, or it's a type error at the column.

// ---- Songs column (PlayingTrackList → TrackList, ShowHeader, QueueMenu) ----

/**
 * A track row. The queue menu builds a queue item from it, so it keeps `mp3Url`;
 * its `sourceId` is the tape's id, so the menu takes that from the tape instead.
 */
export type SongsTrack = Pick<Track, 'id' | 'slug' | 'title' | 'duration' | 'mp3Url' | 'songs'>;

export type SongsSet = Pick<SourceSet, 'id' | 'name'> & { tracks: SongsTrack[] };

/** Every tape keeps its tracks: the active one is picked on the client, from `?source=`. */
export type SongsSource = SortableSource &
  Pick<Source, 'duration' | 'links'> & { sets: SongsSet[] };

/** The header (art, venue, popularity) and the queue item's show (id, date, venue). */
export type SongsShow = Pick<ShowDetail, 'id' | 'date' | 'venue' | 'popularity'> & {
  sources: SongsSource[];
};

// ---- Sources column (TapesColumn): each tape's summary, no tracks ----

export type TapesSource = SortableSource &
  Pick<
    Source,
    'duration' | 'isRemaster' | 'avgRating' | 'numRatings' | 'numReviews' | 'lineage' | 'taperNotes'
  >;

export type TapesShow = { sources: TapesSource[] };

const sortable = (s: Source): SortableSource => ({
  id: s.id,
  isSoundboard: s.isSoundboard,
  taper: s.taper,
  transferrer: s.transferrer,
  source: s.source,
  upstreamIdentifier: s.upstreamIdentifier,
  avgRatingWeighted: s.avgRatingWeighted,
});

const songsTrack = (t: Track): SongsTrack => ({
  id: t.id,
  slug: t.slug,
  title: t.title,
  duration: t.duration,
  mp3Url: t.mp3Url,
  ...(t.songs && { songs: t.songs }),
});

export const songsProjection = (show: ShowDetail): SongsShow => ({
  id: show.id,
  date: show.date,
  venue: show.venue,
  popularity: show.popularity,
  sources: show.sources.map((s) => ({
    ...sortable(s),
    duration: s.duration,
    links: s.links,
    sets: s.sets.map((set) => ({ id: set.id, name: set.name, tracks: set.tracks.map(songsTrack) })),
  })),
});

export const tapesProjection = (show: ShowDetail): TapesShow => ({
  sources: show.sources.map((s) => ({
    ...sortable(s),
    duration: s.duration,
    isRemaster: s.isRemaster,
    avgRating: s.avgRating,
    numRatings: s.numRatings,
    numReviews: s.numReviews,
    lineage: s.lineage,
    taperNotes: s.taperNotes,
  })),
});
