import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const TourShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [tour, initialFilters] = await Promise.all([
    RelistenAPI.fetchTourShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={tour.name}
      shows={tour.shows || []}
      initialFilters={initialFilters}
      backHref={`/${artistSlug}/tours`}
      fullDate
    />
  );
};

export default TourShowsColumn;
