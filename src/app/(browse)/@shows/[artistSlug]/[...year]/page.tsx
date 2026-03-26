import ShowsColumn from '@/components/ShowsColumn';
import { getCurrentMonthDay } from '@/lib/timezone';
import showsSearchParams from './search-params';

export default async function ShowsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string }>;
}) {
  const { artistSlug, year } = await params;
  const [parsed, currentMonthDay] = await Promise.all([
    showsSearchParams.load(),
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
