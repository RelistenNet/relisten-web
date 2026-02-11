import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import ArtistSongsColumn from './ArtistSongsColumn';
import RecentTapesColumn from './RecentTapesColumn';
import ShowsColumnWithControls from './ShowsColumnWithControls';
import SongShowsColumn from './SongShowsColumn';
import TodayInHistoryColumn from './TodayInHistoryColumn';
import TopTapesColumn from './TopTapesColumn';
import ToursColumn from './ToursColumn';
import TourShowsColumn from './TourShowsColumn';
import VenuesColumn from './VenuesColumn';
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
  if (year === 'recently-added') return <RecentTapesColumn artistSlug={artistSlug} />;
  if (year === 'top') return <TopTapesColumn artistSlug={artistSlug} />;
  if (year === 'venues' && slug && artistSlug)
    return <VenueShowsColumn artistSlug={artistSlug} slug={slug} />;
  if (year === 'venues') return <VenuesColumn artistSlug={artistSlug} />;
  if (year === 'songs' && slug && artistSlug)
    return <SongShowsColumn artistSlug={artistSlug} slug={slug} />;
  if (year === 'songs') return <ArtistSongsColumn artistSlug={artistSlug} />;
  if (year === 'tours' && slug && artistSlug)
    return <TourShowsColumn artistSlug={artistSlug} slug={slug} />;
  if (year === 'tours') return <ToursColumn artistSlug={artistSlug} />;

  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
  });

  const artist = artists?.find((a) => a.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const yearObj = artistYears?.find((y) => y.year === year);
  const artistShows = await RelistenAPI.fetchShows(artist?.uuid, yearObj?.uuid);

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={artistShows?.shows || []}
      initialFilters={initialFilters}
    />
  );
};

export default ShowsColumn;
