import ShowsColumn from '@/components/ShowsColumn';
import { getCurrentMonthDay } from '@/lib/timezone';
import { getSegmentParams } from '@timber-js/app/server';
import { searchParams } from './params';
import { SEGMENT_PATH } from './$segment';

export default async function ShowsDaySlot() {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);
  let month: string | undefined;
  let day: string | undefined;

  try {
    const [parsed, currentMonthDay] = await Promise.all([searchParams.get(), getCurrentMonthDay()]);
    month = parsed.month ?? currentMonthDay.month;
    day = parsed.day ?? currentMonthDay.day;
  } catch {
    const currentMonthDay = await getCurrentMonthDay();
    month = currentMonthDay.month;
    day = currentMonthDay.day;
  }

  return (
    <ShowsColumn
      artistSlug={artistSlug}
      year={year[0]}
      month={month}
      day={day}
      // slug={parsedSlug.slug ?? undefined}
    />
  );
}
