import VenuesColumn from '@/components/VenuesColumn';

export default async function Page({ params }: { params: Promise<{ artistSlug: string }> }) {
  const artistSlug = (await params).artistSlug ?? 'grateful-dead';

  return <VenuesColumn artistSlug={artistSlug} />;
}
