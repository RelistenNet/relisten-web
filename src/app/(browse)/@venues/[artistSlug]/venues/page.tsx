import VenuesColumn from '@/components/VenuesColumn';

export default async function Page({ params }) {
  const artistSlug = (await params).artistSlug ?? 'grateful-dead';

  return <VenuesColumn artistSlug={artistSlug} />;
}
