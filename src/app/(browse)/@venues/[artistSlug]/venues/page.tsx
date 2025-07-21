import VenuesColumnWithControls from '@/components/VenuesColumnWithControls';

export default async function Page({ params }) {
  const artistSlug = (await params).artistSlug ?? 'grateful-dead';

  return <VenuesColumnWithControls artistSlug={artistSlug} />;
}
