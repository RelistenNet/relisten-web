import ShowsColumn from '@/components/ShowsColumn';
import { isMobile } from '@/lib/isMobile';
import { paramAsString } from '@/lib/paramHelpers';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { rawSegmentParams } from '@timber-js/app/server';

export default async function ShowsDaySlot() {
  if (await isMobile()) return null;

  const artistSlug = paramAsString((await rawSegmentParams()).artistSlug);
  if (!artistSlug) return null;

  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return null;

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
