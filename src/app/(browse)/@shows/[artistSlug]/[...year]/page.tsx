import ShowsColumn from '@/components/ShowsColumn';
import { dateSearchParams } from '@/lib/searchParams/dateSearchParam';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { getCurrentMonthDay } from '@/lib/timezone';

export default async function ShowsDaySlot({
  params,
  searchParams,
}: {
  params: Promise<{ artistSlug: string; year: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { artistSlug, year } = await params;
  const [parsed, parsedSlug, currentMonthDay] = await Promise.all([
    dateSearchParams.parseAndValidate(searchParams),
    slugSearchParams.parseAndValidate(searchParams),
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
      slug={parsedSlug.slug ?? undefined}
    />
  );
}
