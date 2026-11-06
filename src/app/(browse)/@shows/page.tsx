import { loadRandomShow } from '@/features/browse/load';
import ShowsColumn from '@/features/browse/ShowsColumn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { splitShowDate } from '@/lib/utils';

export default async function ShowsDaySlot() {
  const show = await loadRandomShow(DEFAULT_ARTIST_SLUG);

  if (!show) return null;

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={DEFAULT_ARTIST_SLUG} year={year} />;
}
