import SongsColumn from '@/components/SongsColumn';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function SongsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string }>;
}) {
  if (await isMobile()) return null;

  const { artistSlug } = await params;

  // Fetch show data
  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return notFound();

  const { year, month, day } = splitShowDate(show.display_date);

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
