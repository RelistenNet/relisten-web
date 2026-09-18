import RelistenAPI from '@/lib/RelistenAPI';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const VenueShowsColumn = async ({ artistSlug, slug, quickHitSegment }: { artistSlug: string; slug: string; quickHitSegment?: string }) => {
  const venue = await RelistenAPI.fetchVenueShows(artistSlug, slug).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={venue?.name}
      shows={venue?.shows ?? []}
      fullDate
      quickHitSegment={quickHitSegment}
      quickHitSlug={slug}
    />
  );
};

export default VenueShowsColumn;
