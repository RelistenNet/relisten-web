import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { SEGMENT_PATH } from './$segment';

export default async function SongsYearSlot() {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);

  if (!isQuickHitSegment(year)) return null;

  const { date, slug } = await slugSearchParams.get();
  if (!date) return null;

  const { year: y, month: m, day: d } = splitShowDate(date);
  if (!y || !m || !d) return null;

  const show = await RelistenAPI.fetchShow(artistSlug, y, date);
  if (!show) return null;

  return <SongsColumn artistSlug={artistSlug} year={y} month={m} day={d} show={show} quickHitSegment={year} quickHitSlug={slug} />;
}
