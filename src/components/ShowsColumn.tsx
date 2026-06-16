import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { RawParams } from '@/types/params';
import type { Venue, Tour } from '@/types';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';
import SongShowsColumn from './SongShowsColumn';
import TodayInHistoryColumn from './TodayInHistoryColumn';
import TourShowsColumn from './TourShowsColumn';
import VenueShowsColumn from './VenueShowsColumn';

const ShowsColumn = async ({
  artistSlug,
  year,
  month,
  day,
  slug,
}: Pick<RawParams, 'artistSlug' | 'year'> & { month?: string; day?: string; slug?: string }) => {
  if (year === 'today-in-history' && month && day)
    return <TodayInHistoryColumn artistSlug={artistSlug} month={month} day={day} />;

  // Drill-down into a specific venue/song/tour
  if (year === 'venues' && slug && artistSlug)
    return <VenueShowsColumn artistSlug={artistSlug} slug={slug} />;
  if (year === 'songs' && slug && artistSlug)
    return <SongShowsColumn artistSlug={artistSlug} slug={slug} />;
  if (year === 'tours' && slug && artistSlug)
    return <TourShowsColumn artistSlug={artistSlug} slug={slug} />;

  // Quick-hit lists (recently-added, top, venues, songs, tours) now render
  // in the @years column. Return null so this slot stays empty.
  if (isQuickHitSegment(year)) return null;

  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchAllArtists(),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  const artist = artists?.find((a) => a.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const yearObj = artistYears?.find((y) => y.year === year);
  const artistShows = await RelistenAPI.fetchShows(artist?.uuid, yearObj?.uuid);

  // Trim shows to only the fields the UI needs. Full show objects include
  // artist_uuid, year_uuid, venue_uuid, era, most_recent_source_updated_at,
  // has_streamable_flac_source, created_at, updated_at, and full venue/tour
  // sub-objects. Trimming reduces the RSC payload by ~90% for this slot.
  const slimShows = (artistShows?.shows || []).map((s) => ({
    id: s.id,
    uuid: s.uuid,
    display_date: s.display_date,
    has_soundboard_source: s.has_soundboard_source,
    popularity: s.popularity,
    source_count: s.source_count,
    avg_duration: s.avg_duration,
    venue: s.venue ? ({ name: s.venue.name, location: s.venue.location } as Venue) : undefined,
    tour: s.tour ? ({ id: s.tour.id, name: s.tour.name } as Tour) : undefined,
  }));

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={slimShows}
      initialFilters={initialFilters}
    />
  );
};

export default ShowsColumn;
