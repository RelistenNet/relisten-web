import { loadTour } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from './ArtistShowList';
import { showColumns } from '@/ui/shows/columns';
import { formatShowDate } from '@/ui/shows/stats';
import { tourUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
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
  return (
    <ArtistShowList
      artist={artist}
      title={tour.name}
      stats={[
        { label: 'Shows', value: numberFormat.format(tour.rows.length) },
        ...(tour.startDate ? [{ label: 'First show', value: formatShowDate(tour.startDate) }] : []),
        ...(tour.endDate ? [{ label: 'Last show', value: formatShowDate(tour.endDate) }] : []),
      ]}
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
