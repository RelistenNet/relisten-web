import { findArtistBySlug } from '@/data/artists';
import { loadShow } from '@/features/browse/load';
import TrackList from '@/player/PlayingTrackList';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

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
      show={show}
    />
  );
}
