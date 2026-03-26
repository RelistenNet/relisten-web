import ShowsColumn from '@/components/ShowsColumn';
import { getCurrentMonthDay } from '@/lib/timezone';
import { searchParams } from './params';

export default async function ShowsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string }>;
}) {
  const { artistSlug, year } = await params;
  const [parsed, currentMonthDay] = await Promise.all([
    searchParams.load(),
    getCurrentMonthDay(),
  ]);

  const month = parsed.month ?? currentMonthDay.month;
  const day = parsed.day ?? currentMonthDay.day;

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
