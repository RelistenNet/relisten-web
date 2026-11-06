import { loadRandomShow } from '@/features/browse/load';
import SongsColumn from '@/ui/show/SongsColumn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { splitShowDate } from '@/lib/utils';

export default async function SongsDaySlot() {
  const show = await loadRandomShow(DEFAULT_ARTIST_SLUG);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.date);

  return (
    <SongsColumn artistSlug={DEFAULT_ARTIST_SLUG} year={year} month={month} day={day} show={show} />
  );
}
