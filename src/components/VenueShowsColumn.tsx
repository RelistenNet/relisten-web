import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const VenueShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [venue, initialFilters] = await Promise.all([
    RelistenAPI.fetchVenueShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={venue?.name}
      shows={venue?.shows ?? []}
      initialFilters={initialFilters}
      fullDate
    />
  );
};

export default VenueShowsColumn;
