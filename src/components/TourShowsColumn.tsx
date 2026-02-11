import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { notFound } from 'next/navigation';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const TourShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [tour, initialFilters] = await Promise.all([
    RelistenAPI.fetchTourShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
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
