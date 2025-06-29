import ShowsColumn from '@/components/ShowsColumn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';

export default async function ShowsDaySlot() {
  if (await isMobile()) return null;

  const show = await RelistenAPI.fetchRandomShow(DEFAULT_ARTIST_SLUG);

  if (!show) return null;

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={DEFAULT_ARTIST_SLUG} year={year} />;
}
