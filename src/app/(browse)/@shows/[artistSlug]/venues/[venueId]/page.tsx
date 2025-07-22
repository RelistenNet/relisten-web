import ShowsColumn from '@/components/ShowsColumn';

export default async function ShowsDaySlot({
  params,
}: {
  params: Promise<{ artistSlug: string; venueId: string }>;
}) {
  const { artistSlug, venueId } = await params;

  return <ShowsColumn artistSlug={artistSlug} venueId={venueId} />;
}
