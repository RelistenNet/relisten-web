import ShowsColumn from '@/components/ShowsColumn';
import { paramAsString } from '@/lib/paramHelpers';
import { getCurrentMonthDay } from '@/lib/timezone';
import { getSegmentParams } from '@timber-js/app/server';
import { searchParams } from './params';

export default async function ShowsDaySlot() {
  const raw = await getSegmentParams();
  const artistSlug = paramAsString(raw.artistSlug);
  const year = paramAsString(raw.year);
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
      year={year}
      month={month}
      day={day}
      // slug={parsedSlug.slug ?? undefined}
    />
  );
}
