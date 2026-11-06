import ArtistShowList from '@/components/detail/ArtistShowList';
import { showColumns } from '@/components/table/showColumns';
import RelistenAPI from '@/lib/RelistenAPI';
import { formatShowDate } from '@/lib/table/showStats';
import { tourUrl } from '@/lib/urls';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** A tour's shows, in order. */
export default async function TourPage() {
  const { artistSlug, tourSlug } = getSegmentParams(SEGMENT_PATH);
  const [artist, tour] = await Promise.all([
    RelistenAPI.findArtist(artistSlug),
    RelistenAPI.fetchTourDetail(artistSlug, tourSlug),
  ]);
  if (!artist) deny(404);
  const dates =
    tour.startDate && tour.endDate
      ? `${formatShowDate(tour.startDate)} – ${formatShowDate(tour.endDate)} · `
      : '';
  return (
    <ArtistShowList
      artistSlug={artistSlug}
      artistName={artist.name ?? artistSlug}
      title={tour.name}
      subtitle={`${dates}${tour.rows.length} shows`}
      rows={tour.rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'asc' }}
      pathname={tourUrl(artistSlug, tourSlug)}
    />
  );
}

export const metadata = async () => {
  const { artistSlug, tourSlug } = getSegmentParams(SEGMENT_PATH);
  const [artist, tour] = await Promise.all([
    RelistenAPI.findArtist(artistSlug),
    RelistenAPI.fetchTourDetail(artistSlug, tourSlug).catch(() => null),
  ]);
  return tour ? { title: `${tour.name} | ${artist?.name}` } : {};
};
