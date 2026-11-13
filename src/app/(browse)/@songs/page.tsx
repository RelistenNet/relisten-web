import { findArtistBySlug } from '@/data/artists';
import { loadRandomShow } from '@/features/browse/load';
import TrackList from '@/player/PlayingTrackList';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { songsProjection } from '@/lib/showProjection';
import { splitShowDate } from '@/lib/utils';

export default async function SongsDaySlot() {
  const [show, artist] = await Promise.all([
    loadRandomShow(DEFAULT_ARTIST_SLUG),
    findArtistBySlug(DEFAULT_ARTIST_SLUG),
  ]);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.date);

  return (
    <TrackList
      artistSlug={DEFAULT_ARTIST_SLUG}
      artistName={artist?.name}
      year={year}
      month={month}
      day={day}
      show={songsProjection(show)}
    />
  );
}
