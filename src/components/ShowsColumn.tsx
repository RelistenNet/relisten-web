import RelistenAPI from '@/lib/RelistenAPI';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { slimShows } from '@/lib/slimShow';
import { RawParams } from '@/types/params';
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

  if (year === 'venues' && slug && artistSlug)
    return <VenueShowsColumn artistSlug={artistSlug} slug={slug} quickHitSegment="venues" />;
  if (year === 'songs' && slug && artistSlug)
    return <SongShowsColumn artistSlug={artistSlug} slug={slug} quickHitSegment="songs" />;
  if (year === 'tours' && slug && artistSlug)
    return <TourShowsColumn artistSlug={artistSlug} slug={slug} quickHitSegment="tours" />;

  if (isQuickHitSegment(year)) return null;

  const artists = await RelistenAPI.fetchAllArtists().catch(() => {
    deny(404);
  });

  const artist = artists?.find((a) => a.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const yearObj = artistYears?.find((y) => y.year === year);
  const artistShows = await RelistenAPI.fetchShows(artist?.uuid, yearObj?.uuid);

  return <ShowsColumnWithControls artistSlug={artistSlug} year={year} shows={slimShows(artistShows?.shows)} />;
};

export default ShowsColumn;
