import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { notFound } from 'next/navigation';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const VenueShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [venue, initialFilters] = await Promise.all([
    RelistenAPI.fetchVenueShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={venue.name}
      shows={venue.shows || []}
      initialFilters={initialFilters}
      backHref={`/${artistSlug}/venues`}
      fullDate
    />
  );
};

export default VenueShowsColumn;
