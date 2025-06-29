import TapesColumn from '@/components/TapesColumn';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function SourcesDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string; month: string; day: string }>;
}) {
  if (await isMobile()) return null;
  const { artistSlug, year, month, day } = await params;

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) return notFound();

  return <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
