import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import TodayInHistoryRow from './TodayInHistoryRow';
import RecentTapesRow from './RecentTapesRow';
import VenuesColumnWithControls from './VenuesColumnWithControls';

const VenuesColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, artistVenues, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    RelistenAPI.fetchVenues(artistSlug),
    getServerFilters(artistSlug || '', true),
  ]).catch(() => {
    notFound();
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);

  const venues = artistVenues.filter((venue) => venue.shows_at_venue && venue.shows_at_venue > 0);

  return (
    <VenuesColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistVenues={venues}
      initialFilters={initialFilters}
    >
      <TodayInHistoryRow artistSlug={artistSlug} />
      <RecentTapesRow artistSlug={artistSlug} />
    </VenuesColumnWithControls>
  );
};

export default VenuesColumn;
