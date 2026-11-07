import { findArtistBySlug } from '@/data/artists';
import { loadRandomShow } from '@/features/browse/load';
import TrackList from '@/player/PlayingTrackList';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SongsDaySlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);

  const [show, artist] = await Promise.all([
    loadRandomShow(artistSlug),
    findArtistBySlug(artistSlug),
  ]);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.date);

  return (
    <TrackList
      artistSlug={artistSlug}
      artistName={artist?.name}
      year={year}
      month={month}
      day={day}
      show={show}
    />
  );
}
