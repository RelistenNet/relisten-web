import { loadTour } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from '@/ui/show-table/ArtistShowList';
import { showColumns } from '@/ui/show-table/showColumns';
import { formatShowDate } from '@/ui/show-table/showStats';
import { tourUrl } from '@/lib/urls';
import { deny } from '@timber-js/app/server';

/** A tour's shows, in order. */
export default async function Tour({
  artistSlug,
  tourSlug,
}: {
  artistSlug: string;
  tourSlug: string;
}) {
  const [artist, tour] = await Promise.all([
    findArtistBySlug(artistSlug),
    loadTour(artistSlug, tourSlug),
  ]);
  if (!artist) deny(404);
  const dates =
    tour.startDate && tour.endDate
      ? `${formatShowDate(tour.startDate)} – ${formatShowDate(tour.endDate)} · `
      : '';
  return (
    <ArtistShowList
      artistSlug={artistSlug}
      artistName={artist.name}
      title={tour.name}
      subtitle={`${dates}${tour.rows.length} shows`}
      rows={tour.rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'asc' }}
      pathname={tourUrl(artistSlug, tourSlug)}
    />
  );
}

export async function tourMetadata({
  artistSlug,
  tourSlug,
}: {
  artistSlug: string;
  tourSlug: string;
}) {
  const [artist, tour] = await Promise.all([
    findArtistBySlug(artistSlug),
    loadTour(artistSlug, tourSlug).catch(() => null),
  ]);
  return tour ? { title: `${tour.name} | ${artist?.name}` } : {};
}
