import { findArtistBySlug } from '@/data/artists';
import { loadShow } from '@/features/browse/load';
import TrackList from '@/player/PlayingTrackList';
import { songsProjection } from '@/lib/showProjection';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams, type PageOptions } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// A show's column depends only on the date: switching tapes (`?source=`) is
// picked client-side, so a tape switch skips this slot without rendering it.
export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: ['artistSlug', 'year', 'month', 'days'] },
} satisfies PageOptions;

export default async function SongsDaySlot() {
  const { artistSlug, year, month, days } = getSegmentParams(SEGMENT_PATH);

  const [show, artist] = await Promise.all([
    loadShow(artistSlug, createShowDate(year, month, days[0])),
    findArtistBySlug(artistSlug),
  ]);

  if (!show) return null;

  return (
    <TrackList
      artistSlug={artistSlug}
      artistName={artist?.name}
      year={year}
      month={month}
      day={days[0]}
      show={songsProjection(show)}
    />
  );
}
