import ShowsColumn from '@/components/ShowsColumn';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function ShowsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string }>;
}) {
  if (await isMobile()) return null;

  const { artistSlug } = await params;

  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return notFound();

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
