import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function SongsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string; month: string; day: string }>;
}) {
  const { artistSlug, year, month, day } = await params;

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) return notFound();

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
