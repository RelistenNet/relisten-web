import SongsColumn from '@/components/SongsColumn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function SongsDaySlot() {
  if (await isMobile()) return null;

  // Fetch show data
  const show = await RelistenAPI.fetchRandomShow(DEFAULT_ARTIST_SLUG);

  if (!show) return notFound();

  const { year, month, day } = splitShowDate(show.display_date);

  return (
    <SongsColumn artistSlug={DEFAULT_ARTIST_SLUG} year={year} month={month} day={day} show={show} />
  );
}
