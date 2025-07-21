import ShowsColumn from '@/components/ShowsColumn';

export default async function ShowsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; year: string }>;
}) {
  const { artistSlug, year } = await params;

  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
