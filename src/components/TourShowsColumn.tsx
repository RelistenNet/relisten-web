import RelistenAPI from '@/lib/RelistenAPI';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const TourShowsColumn = async ({ artistSlug, slug, quickHitSegment }: { artistSlug: string; slug: string; quickHitSegment?: string }) => {
  const tour = await RelistenAPI.fetchTourShows(artistSlug, slug).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={tour?.name}
      shows={tour?.shows ?? []}
      fullDate
      quickHitSegment={quickHitSegment}
      quickHitSlug={slug}
    />
  );
};

export default TourShowsColumn;
